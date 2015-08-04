.PHONY: all clean

JS_SRCS=\
	client/controller.js \
	client/dropdirective.js \
	client/filedialog.js \
	client/files.js \
	client/app.js
JS_DEPS=\
	third_party/angular/angular.min.js \
	third_party/angular/angular-animate.min.js \
	third_party/angular/angular-aria.min.js \
	third_party/angular/angular-messages.min.js \
	third_party/angular-material/angular-material.min.js
THIRD_PARTY_LICENSES=\
	third_party/angular/LICENSE \
	third_party/angular-material/LICENSE \
	third_party/material_design_icons/LICENSE \
	third_party/roboto/LICENSE.txt

all: LICENSE.all filedrop client/bundle.css client/bundle.js

LICENSE.all: LICENSE $(THIRD_PARTY_LICENSES)
	cp LICENSE $@
	for name in $(THIRD_PARTY_LICENSES); do \
	  echo >> $@; \
	  echo "******************** $$name ********************" >> $@; \
	  echo >> $@; \
	  cat $$name >> $@; \
	done

filedrop: filedrop.go
	go get -d
	go build -o $@

client/bundle.js: client/deps.js client/compiled_js.js
	cat $^ > $@

client/bundle.css: third_party/angular-material/angular-material.min.css client/style.css
	cat $^ > $@

client/deps.js: $(JS_DEPS)
	cat $^ | sed -e '/sourceMappingURL=/d' > $@

# TODO(light): compile JS if Closure Compiler present
client/compiled_js.js: $(JS_SRCS)
	cat $^ > $@

clean:
	rm -f LICENSE.all filedrop client/bundle.js client/bundle.css client/deps.js client/compiled_js.js
