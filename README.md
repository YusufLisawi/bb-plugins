# BB plugins

Private source repository for BB plugins maintained by Yusuf.

Each directory in `plugins/` is an independent BB plugin. Install a selected
entry through BB's collection support, for example:

```sh
bb plugin install git:https://github.com/YusufLisawi/bb-plugins.git@main --plugin sync
```

Update managed plugins on either BB server with:

```sh
bb plugin update --all
```

Builtin and third-party plugins are intentionally not mirrored here.
