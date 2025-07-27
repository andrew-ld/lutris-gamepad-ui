{
  "targets": [
    {
      "target_name": "nativelib",
      "sources": [ "src/addon.cpp" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
      "link_settings": {
        "libraries": [
          "-lX11"
        ]
      }
    }
  ]
}
