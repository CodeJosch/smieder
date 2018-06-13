const path = require("path");
const fs = require("fs-extra");
const debug = require("debug")("smieder_:scripts");
const compressor = require('node-minify');

const compress = (newTimes, options) => {
    debug("Compressing javascripts " + options.files.join(", ") + " to " + options.save);

    return compressor.minify(settings = {
        "compressor": options.compressor || "no-compress",
        "input": options.files,
        "output": options.save
    })
        .then((minified) => {
            if (minified) {
                debug("Done compressing javascripts for " + options.save);
            } else {
                debug("Compressing javascripts for " + options.save + " resulted in empty file");
            }

            if (options.force) {
                debug("force in effect - will not save modification times");
                return minified;
            }
            let timesFile = timesFileName(options.save);
            return fs.writeFile(timesFile, newTimes)
                .then(() => debug("Saved time info to " + timesFile))
                .then(() => minified)


        });
};

const compressSync = (options) => {
    debug("SYNC Compressing javascripts " + options.files.join(", ") + " to " + options.save);

    const newTimes = options.files.map((fileName) => fs.statSync(fileName))
        .map((stat) => stat.mtime.getTime()).join("-");

    compressor.minify(settings = {
        "compressor": options.compressor || "no-compress",
        "input": options.files,
        "output": options.save,
        "sync": true,
        "callback": function (err, minified) {
            if (minified) {
                debug("Done compressing javascripts on startup for " + options.save);
            } else {
                debug("Compressing javascripts on startup for " + options.save + " resulted in empty file");
            }

            if (options.force) {
                debug("force in effect - will not save modification times");
                return;
            }
            let timesFile = timesFileName(options.save);
            fs.writeFileSync(timesFile, newTimes);
            debug("Saved time info to " + timesFile);
        }
    })
};

const timesFileName = (origName) => {
    const parsedPath = path.parse(origName);
    return path.join(parsedPath.dir, "~" + parsedPath.base) + ".times";
};

const loadTimesFileSync = (origName) => {
    const timesFile = timesFileName(origName);
    let lastTimes = "";
    try {
        lastTimes = fs.readFileSync(timesFile, 'utf8');
        debug("Time info loaded from " + timesFile);
    } catch (err) {
        debug("Could not load time info, will recreate file in any case on first call");
    }
    return lastTimes;
}

const actualTimes = (options) => {
    if (options.force) {
        debug("force in effect - will not load modification times");
        return Promise.resolve("");
    }
    const proms = options.files.map((fileName) => fs.stat(fileName));
    return Promise.all(proms)
        .then((stats) => stats.map((stat) => stat.mtime.getTime()).join("-"))
};

module.exports = (options) => {
    if (!options) {
        throw(new Error("No options supplied"));
    }
    if (!options.save) {
        throw(new Error("No file to save set - please set options.save"));
    }
    if (!options.files) {
        throw(new Error("No files to compress/concat. Please set options.files"));
    }

    let lastTimes = "";
    if (options.startsync) {
        lastTimes = compressSync(options);
    } else if (!options.force) {
        lastTimes = loadTimesFileSync(options.save);
    }

    return (req, res, next) => {
        debug(req.method + " " + req.originalUrl);
        actualTimes(options)
            .then((newTimes) => {
                const changes = !lastTimes || lastTimes !== newTimes;
                const destfileExists = fs.existsSync(options.save);

                if (changes || !destfileExists) {
                    if (options.force) {
                        debug("force in effect - will enforce recompression");
                    } else {
                        if (changes) debug("One or more files were modified");
                        if (!destfileExists) debug("File " + options.save + " does not exist");
                        lastTimes = newTimes;
                    }
                    return compress(newTimes, options);
                }
                debug("No files were modified, sending " + options.save);
                return fs.readFile(options.save, "utf8");
            })
            .then((msg) => {
                res.header("Content-Type", "application/javascript");
                res.header("Content-Length", "" + msg.length);
                debug("Sending " + msg.length + " bytes of javascript.")
                res.send(msg);
            })
            .catch(next);

    }
};
