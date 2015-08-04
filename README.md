# FileDrop

FileDrop is a small web-based file-sharing UI.  It can be used as a standalone
server in trusted LANs, but it can optionally use [Sandstorm](sandstorm) for
ACLs and sharing.

## Dependencies

FileDrop requires Go 1.4 to build.  Other dependencies are vendored in
`third_party`.

## Building and Running Locally

```
make
./filedrop -address=:8080 -storage=/var/directory/for/files
```

## Building an SPK

```
make
spk pack filedrop.spk
```

## API

You can download/upload files by using the standard HTTP verbs on the `/file/`
resource.  For example:

```
# Download foo.jpg
curl -s http://localhost:8080/file/foo.jpg > foo.jpg
# Upload bar.txt
curl -T bar.txt http://localhost:8080/file/
```

If you're using Sandstorm web keys, remember to use `-H 'Authorization: Bearer
TOKEN` to authorize the request.

## License

Apache License 2.0.  See LICENSE for details.

This is not an official Google product (experimental or otherwise), it is just
code that happens to be owned by Google.

[sandstorm]: https://sandstorm.io/
