var gulp = require("gulp"),
    gutil = require("gulp-util"),
    path = require("path"),
    through2 = require('through2');

// Config
var config = { path: { root: path.resolve(__dirname) + "/" } };

// Source
config.path.sass = config.path.root + "scss/";
config.path.sprites = config.path.root + "sprites/";
config.path.spritesOut = config.path.root + "build/fonts/";

// Compiled
config.path.css = config.path.root + "build/css/";

// SASS / SCSS > CSS
var sass = require("gulp-sass"),
    sassVariables = require("gulp-sass-variables"),
    plumber = require("gulp-plumber");

    sass.compiler = require('dart-sass');

gulp.task("sass", function(done) {
  return gulp.src([ config.path.sass + "**/*.scss" ])
    .pipe(sassVariables({ $env: gutil.env.production ? 'production' : 'development' }))
    .pipe(plumber({ errorHandler: logger.error }))
    .pipe(sass.sync({
      precision: 8,
      includePaths: ["node_modules"]
    }))
    .pipe(through2.obj(
      function(file, _, cb) {
        const date = new Date();

        file.stat.atime = date;
        file.stat.mtime = date;

        cb(null, file);
    }))
    .pipe(gulp.dest(config.path.css));

    done();
});

// SVG Font
// ==============================
var iconfont = require("gulp-iconfont"),
    runTimeStamp = Math.round(Date.now() / 1000),
    async = require("async"),
    consolidate = require("gulp-consolidate"),
    rename = require("gulp-rename");

gulp.task("iconFont", function(done) {
  var fontOptions = {
    fontName: "nyc-icon",
    prependUnicode: true,
    startUnicode: 0xED0F,
    fontHeight: 1000,
    centerHorizontally: true,
    normalize: true,
    formats: ["eot", "woff", "woff2", "ttf"],
    timestamp: runTimeStamp,
  };

  var iconStream = gulp.src([ config.path.sprites + "*.svg" ]).pipe(iconfont(fontOptions));

  async.parallel([
    function handleGlyphs(cb) {
      iconStream.on("glyphs", function(glyphs, options) {
        gulp.src("icon-generator/_icons-template.css.ejs")
          .pipe(plumber({ errorHandler: logger.error }))
          .pipe(consolidate("lodash", {
            glyphs: glyphs,
            fontName: fontOptions.fontName,
            fontPath: config.path.spritesOut,
            className: "nyc-icon"
          }))
          .pipe(rename("_icons-template.scss"))
          .pipe(gulp.dest(config.path.sass + "nyc-icons"));

        gulp.src("icon-generator/_icons-classes.css.ejs")
          .pipe(plumber({ errorHandler: logger.error }))
          .pipe(consolidate("lodash", {
            glyphs: glyphs,
            fontName: fontOptions.fontName,
            fontPath: config.path.spritesOut,
            className: "nyc-icon"
          }))
          .pipe(rename("_icons-classes.scss"))
          .pipe(gulp.dest(config.path.sass + "nyc-icons"))
          .on("finish", cb);
      });
    },
    function handleFonts(cb) {
      iconStream
        .pipe(gulp.dest(config.path.spritesOut))
        .on("finish", cb);
    }
  ], done);
});

// Notifications
// ==============================
var notify = require("gulp-notify");

var logger = {
  log: function() {
    var parts = 1 <= arguments.length ? [].slice.call(arguments, 0) : [];

    return gutil.log.call(null, logger.format.apply(null, parts));
  },
  format: function() {
    var parts = 1 <= arguments.length ? [].slice.call(arguments, 0) : [];

    return parts.join(" ").replace(config.path.root, "", "g");
  },
  error: function(error) {
    notify.onError({
      title: "Error (" + error.plugin + ")",
      message: logger.format(error.message)
    }).apply(this, arguments);

    return this.emit("end");
  }
};
