# smieder
Simple node express middleware to concat and/or compress javascript files on the fly. 
It basically is a middleware for [node-minify](https://www.npmjs.com/package/node-minify) taking care of modification of the scriptfiles, no file watchers are used.



**Install**

```
npm i smieder
```

**Usage**

When setting up your routes in your express app, just set up routes to your desired urls with the smieder.

```js
const smieder = require("smieder");

// ....

app.use("/js/libfiles", smieder({
    "save": "public/javascripts/libs.min.js",       // filepath where you want to save the concatenated file
    "files": [                                      // array of javasript files
        "node_modules/anylib/dist/coollib.min.js", 
        "node_modules/anotherlib/scripting.min.js",
        "node_modules/jquery/dist/jquery.min.js",
        "public/javascripts/vectors.js",
        "public/javascripts/bananas.js"
    ],
    
    // -------------------------
    // further optional settings
    // -------------------------
    "force": false,                                 // (optional, default false) set true if you no not want  caching based on modification timestamps  
    "startsync": false,                             // (optional, default false) on startup, syncronously create files
    "compressor": "no-compress"                     // (optional, default "no-compress") or "gcc" or "uglify-js", one that your os and node-minify supports
        
}));
```


**Remark**

On every request received, the modification timestamps of the javascript files are checked and written to a file corresponsting to the _save_ option.
eg., if you specified `"public/javascripts/libs.min.js"` a file  `"public/javascripts/~libs.min.js.times"` gets created.
You might find it useful to add a .gitignore for *.times.
