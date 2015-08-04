// Copyright 2015 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"flag"
	"fmt"
	"html/template"
	"io"
	"net/http"
	"os"
	slashpath "path"
	"path/filepath"
	"strings"

	"github.com/gorilla/mux"
	"zombiezen.com/go/webapp"
)

var (
	address       = flag.String("address", "", "address to listen on")
	storage       = flag.String("storage", "", "directory to store files in")
	dataDir       = flag.String("datadir", ".", "directory to get resources from")
	sandstormACLs = flag.Bool("sandstorm_acls", false, "use Sandstorm ACLs")
)

var indexTemplate *template.Template

func main() {
	flag.Parse()
	if *address == "" {
		fmt.Fprintln(os.Stderr, "filedrop: -address missing")
		os.Exit(1)
	}
	if *storage == "" {
		fmt.Fprintln(os.Stderr, "filedrop: -storage missing")
		os.Exit(1)
	}

	initTemplates()
	initStorage()
	initHandlers()
	http.ListenAndServe(*address, nil)
}

func initTemplates() {
	var err error
	indexTemplate, err = template.New("").Delims("[[", "]]").ParseFiles(filepath.Join(*dataDir, "index.html"))
	if err != nil {
		fmt.Fprintln(os.Stderr, "filedrop: failed to parse template:", err)
		os.Exit(1)
	}
}

func initStorage() {
	if err := os.MkdirAll(*storage, 0777); err != nil {
		fmt.Fprintln(os.Stderr, "filedrop: failed to create storage dir:", err)
		os.Exit(1)
	}
}

func initHandlers() {
	r := mux.NewRouter()
	http.Handle("/", r)

	r.HandleFunc("/", handleIndex)
	r.Handle("/file/", checkPerm("read", http.HandlerFunc(handleList))).Methods("GET")
	r.Handle("/file/{name}", checkPerm("read", http.HandlerFunc(handleDownload))).Methods("GET")
	r.Handle("/file/{name}", checkPerm("write", http.HandlerFunc(handleUpload))).Methods("PUT")
	r.Handle("/file/{name}", checkPerm("delete", http.HandlerFunc(handleDelete))).Methods("DELETE")
	r.Handle("/bundle.css", resourceHandler("client/bundle.css"))
	r.Handle("/bundle.js", resourceHandler("client/bundle.js"))
	r.Handle("/fonts/Roboto-Regular.woff", resourceHandler("third_party/roboto/Roboto-Regular.woff"))
	r.Handle("/fonts/Roboto-Bold.woff", resourceHandler("third_party/roboto/Roboto-Bold.woff"))
	r.Handle("/icons/action.svg", resourceHandler("third_party/material_design_icons/sprites/svg-sprite/svg-sprite-action.svg"))
	r.Handle("/icons/file.svg", resourceHandler("third_party/material_design_icons/sprites/svg-sprite/svg-sprite-file.svg"))
	r.Handle("/icons/navigation.svg", resourceHandler("third_party/material_design_icons/sprites/svg-sprite/svg-sprite-navigation.svg"))
}

func handleIndex(w http.ResponseWriter, req *http.Request) {
	var perms []string
	if *sandstormACLs {
		perms = sandstormPermissions(req.Header)
	} else {
		perms = []string{"read", "write", "delete"}
	}
	w.Header().Set(webapp.HeaderContentType, webapp.HTMLType)
	indexTemplate.ExecuteTemplate(w, "index.html", struct {
		Permissions []string
	}{
		perms,
	})
}

func handleList(w http.ResponseWriter, req *http.Request) {
	dir, err := os.Open(*storage)
	if err != nil {
		http.Error(w, "list failed", http.StatusInternalServerError)
		return
	}
	names, err := dir.Readdirnames(-1)
	if err != nil {
		http.Error(w, "list failed", http.StatusInternalServerError)
		return
	}
	dl := dirlist{Entries: make([]dirent, len(names))}
	for i, n := range names {
		dl.Entries[i].Name = n
	}
	webapp.JSONResponse(w, dl)
}

type dirlist struct {
	Entries []dirent `json:"entries"`
}

type dirent struct {
	Name string `json:"name"`
}

func handleDownload(w http.ResponseWriter, req *http.Request) {
	fname := mux.Vars(req)["name"]
	p, err := cleanPath(*storage, fname)
	if err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	f, info, err := openRegularFile(p)
	if err != nil {
		http.NotFound(w, req)
		return
	}
	w.Header().Set(webapp.HeaderContentDisposition, "attachment; filename="+slashpath.Base(fname))
	http.ServeContent(w, req, fname, info.ModTime(), f)
	f.Close()
}

func handleUpload(w http.ResponseWriter, req *http.Request) {
	p, err := cleanPath(*storage, mux.Vars(req)["name"])
	if err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	f, created, err := createFile(p)
	if err != nil {
		http.Error(w, "upload failed", http.StatusInternalServerError)
		return
	}
	_, werr := io.Copy(f, req.Body)
	cerr := f.Close()
	if werr != nil || cerr != nil {
		http.Error(w, "upload failed", http.StatusInternalServerError)
		return
	}
	if created {
		webapp.ContentLength(w.Header(), 0)
		w.WriteHeader(http.StatusCreated)
	} else {
		w.WriteHeader(http.StatusNoContent)
	}
}

func handleDelete(w http.ResponseWriter, req *http.Request) {
	p, err := cleanPath(*storage, mux.Vars(req)["name"])
	if err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	err = os.Remove(p)
	if os.IsNotExist(err) {
		http.NotFound(w, req)
		return
	} else if err != nil {
		http.Error(w, "delete failed", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func openRegularFile(path string) (f *os.File, info os.FileInfo, err error) {
	f, err = os.Open(path)
	if err != nil {
		return nil, nil, err
	}
	info, err = f.Stat()
	if err != nil || !info.Mode().IsRegular() {
		f.Close()
		return nil, nil, err
	}
	return f, info, nil
}

func createFile(path string) (f *os.File, created bool, err error) {
	const perm os.FileMode = 0666
	f, err = os.OpenFile(path, os.O_WRONLY|os.O_TRUNC|os.O_CREATE|os.O_EXCL, perm)
	if err == nil {
		return f, true, nil
	} else if !os.IsExist(err) {
		return nil, false, err
	}
	f, err = os.OpenFile(path, os.O_WRONLY|os.O_TRUNC|os.O_CREATE, perm)
	if err != nil {
		return nil, false, err
	}
	return f, false, nil
}

func cleanPath(dir, name string) (string, error) {
	if strings.ContainsRune(name, filepath.Separator) || name == "." || name == ".." {
		return "", fmt.Errorf("path %q not allowed", name)
	}
	return filepath.Join(dir, name), nil
}

type resourceHandler string

func (path resourceHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	f, info, err := openRegularFile(filepath.Join(*dataDir, string(path)))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	http.ServeContent(w, r, filepath.Base(string(path)), info.ModTime(), f)
	f.Close()
}

// checkPerm wraps a handler to ensure it has the Sandstorm permission called perm.
func checkPerm(perm string, h http.Handler) http.Handler {
	if !*sandstormACLs {
		return h
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !hasSandstormPermission(r.Header, perm) {
			http.Error(w, "Insufficient Sandstorm permissions", http.StatusForbidden)
			return
		}
		h.ServeHTTP(w, r)
	})
}

// sandstormPermissions extracts the permissions in the request header.
func sandstormPermissions(h http.Header) []string {
	p := h.Get("X-Sandstorm-Permissions")
	if p == "" {
		return nil
	}
	return strings.Split(p, ",")
}

// hasSandstormPermission reports whether the request header contains a permission.
func hasSandstormPermission(h http.Header, perm string) bool {
	ps := sandstormPermissions(h)
	for _, p := range ps {
		if p == perm {
			return true
		}
	}
	return false
}
