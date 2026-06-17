"use strict";
const require$$1$1 = require("electron");
const path$7 = require("path");
const fs$4 = require("fs");
const require$$2$1 = require("crypto");
const require$$3 = require("assert");
const require$$4$1 = require("events");
const require$$2 = require("util");
const require$$1 = require("os");
const fs$5 = require("node:fs");
const require$$0 = require("zlib");
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var source = { exports: {} };
var isObj$1 = (value) => {
  const type2 = typeof value;
  return value !== null && (type2 === "object" || type2 === "function");
};
const isObj = isObj$1;
const disallowedKeys = /* @__PURE__ */ new Set([
  "__proto__",
  "prototype",
  "constructor"
]);
const isValidPath = (pathSegments) => !pathSegments.some((segment) => disallowedKeys.has(segment));
function getPathSegments(path2) {
  const pathArray = path2.split(".");
  const parts = [];
  for (let i = 0; i < pathArray.length; i++) {
    let p = pathArray[i];
    while (p[p.length - 1] === "\\" && pathArray[i + 1] !== void 0) {
      p = p.slice(0, -1) + ".";
      p += pathArray[++i];
    }
    parts.push(p);
  }
  if (!isValidPath(parts)) {
    return [];
  }
  return parts;
}
var dotProp = {
  get(object, path2, value) {
    if (!isObj(object) || typeof path2 !== "string") {
      return value === void 0 ? object : value;
    }
    const pathArray = getPathSegments(path2);
    if (pathArray.length === 0) {
      return;
    }
    for (let i = 0; i < pathArray.length; i++) {
      object = object[pathArray[i]];
      if (object === void 0 || object === null) {
        if (i !== pathArray.length - 1) {
          return value;
        }
        break;
      }
    }
    return object === void 0 ? value : object;
  },
  set(object, path2, value) {
    if (!isObj(object) || typeof path2 !== "string") {
      return object;
    }
    const root = object;
    const pathArray = getPathSegments(path2);
    for (let i = 0; i < pathArray.length; i++) {
      const p = pathArray[i];
      if (!isObj(object[p])) {
        object[p] = {};
      }
      if (i === pathArray.length - 1) {
        object[p] = value;
      }
      object = object[p];
    }
    return root;
  },
  delete(object, path2) {
    if (!isObj(object) || typeof path2 !== "string") {
      return false;
    }
    const pathArray = getPathSegments(path2);
    for (let i = 0; i < pathArray.length; i++) {
      const p = pathArray[i];
      if (i === pathArray.length - 1) {
        delete object[p];
        return true;
      }
      object = object[p];
      if (!isObj(object)) {
        return false;
      }
    }
  },
  has(object, path2) {
    if (!isObj(object) || typeof path2 !== "string") {
      return false;
    }
    const pathArray = getPathSegments(path2);
    if (pathArray.length === 0) {
      return false;
    }
    for (let i = 0; i < pathArray.length; i++) {
      if (isObj(object)) {
        if (!(pathArray[i] in object)) {
          return false;
        }
        object = object[pathArray[i]];
      } else {
        return false;
      }
    }
    return true;
  }
};
var makeDir$1 = { exports: {} };
var semver$3 = { exports: {} };
(function(module, exports) {
  exports = module.exports = SemVer3;
  var debug2;
  if (typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG)) {
    debug2 = function() {
      var args = Array.prototype.slice.call(arguments, 0);
      args.unshift("SEMVER");
      console.log.apply(console, args);
    };
  } else {
    debug2 = function() {
    };
  }
  exports.SEMVER_SPEC_VERSION = "2.0.0";
  var MAX_LENGTH2 = 256;
  var MAX_SAFE_INTEGER2 = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
  9007199254740991;
  var MAX_SAFE_COMPONENT_LENGTH2 = 16;
  var MAX_SAFE_BUILD_LENGTH2 = MAX_LENGTH2 - 6;
  var re2 = exports.re = [];
  var safeRe = exports.safeRe = [];
  var src = exports.src = [];
  var t2 = exports.tokens = {};
  var R = 0;
  function tok(n) {
    t2[n] = R++;
  }
  var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
  var safeRegexReplacements = [
    ["\\s", 1],
    ["\\d", MAX_LENGTH2],
    [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH2]
  ];
  function makeSafeRe(value) {
    for (var i2 = 0; i2 < safeRegexReplacements.length; i2++) {
      var token = safeRegexReplacements[i2][0];
      var max = safeRegexReplacements[i2][1];
      value = value.split(token + "*").join(token + "{0," + max + "}").split(token + "+").join(token + "{1," + max + "}");
    }
    return value;
  }
  tok("NUMERICIDENTIFIER");
  src[t2.NUMERICIDENTIFIER] = "0|[1-9]\\d*";
  tok("NUMERICIDENTIFIERLOOSE");
  src[t2.NUMERICIDENTIFIERLOOSE] = "\\d+";
  tok("NONNUMERICIDENTIFIER");
  src[t2.NONNUMERICIDENTIFIER] = "\\d*[a-zA-Z-]" + LETTERDASHNUMBER + "*";
  tok("MAINVERSION");
  src[t2.MAINVERSION] = "(" + src[t2.NUMERICIDENTIFIER] + ")\\.(" + src[t2.NUMERICIDENTIFIER] + ")\\.(" + src[t2.NUMERICIDENTIFIER] + ")";
  tok("MAINVERSIONLOOSE");
  src[t2.MAINVERSIONLOOSE] = "(" + src[t2.NUMERICIDENTIFIERLOOSE] + ")\\.(" + src[t2.NUMERICIDENTIFIERLOOSE] + ")\\.(" + src[t2.NUMERICIDENTIFIERLOOSE] + ")";
  tok("PRERELEASEIDENTIFIER");
  src[t2.PRERELEASEIDENTIFIER] = "(?:" + src[t2.NUMERICIDENTIFIER] + "|" + src[t2.NONNUMERICIDENTIFIER] + ")";
  tok("PRERELEASEIDENTIFIERLOOSE");
  src[t2.PRERELEASEIDENTIFIERLOOSE] = "(?:" + src[t2.NUMERICIDENTIFIERLOOSE] + "|" + src[t2.NONNUMERICIDENTIFIER] + ")";
  tok("PRERELEASE");
  src[t2.PRERELEASE] = "(?:-(" + src[t2.PRERELEASEIDENTIFIER] + "(?:\\." + src[t2.PRERELEASEIDENTIFIER] + ")*))";
  tok("PRERELEASELOOSE");
  src[t2.PRERELEASELOOSE] = "(?:-?(" + src[t2.PRERELEASEIDENTIFIERLOOSE] + "(?:\\." + src[t2.PRERELEASEIDENTIFIERLOOSE] + ")*))";
  tok("BUILDIDENTIFIER");
  src[t2.BUILDIDENTIFIER] = LETTERDASHNUMBER + "+";
  tok("BUILD");
  src[t2.BUILD] = "(?:\\+(" + src[t2.BUILDIDENTIFIER] + "(?:\\." + src[t2.BUILDIDENTIFIER] + ")*))";
  tok("FULL");
  tok("FULLPLAIN");
  src[t2.FULLPLAIN] = "v?" + src[t2.MAINVERSION] + src[t2.PRERELEASE] + "?" + src[t2.BUILD] + "?";
  src[t2.FULL] = "^" + src[t2.FULLPLAIN] + "$";
  tok("LOOSEPLAIN");
  src[t2.LOOSEPLAIN] = "[v=\\s]*" + src[t2.MAINVERSIONLOOSE] + src[t2.PRERELEASELOOSE] + "?" + src[t2.BUILD] + "?";
  tok("LOOSE");
  src[t2.LOOSE] = "^" + src[t2.LOOSEPLAIN] + "$";
  tok("GTLT");
  src[t2.GTLT] = "((?:<|>)?=?)";
  tok("XRANGEIDENTIFIERLOOSE");
  src[t2.XRANGEIDENTIFIERLOOSE] = src[t2.NUMERICIDENTIFIERLOOSE] + "|x|X|\\*";
  tok("XRANGEIDENTIFIER");
  src[t2.XRANGEIDENTIFIER] = src[t2.NUMERICIDENTIFIER] + "|x|X|\\*";
  tok("XRANGEPLAIN");
  src[t2.XRANGEPLAIN] = "[v=\\s]*(" + src[t2.XRANGEIDENTIFIER] + ")(?:\\.(" + src[t2.XRANGEIDENTIFIER] + ")(?:\\.(" + src[t2.XRANGEIDENTIFIER] + ")(?:" + src[t2.PRERELEASE] + ")?" + src[t2.BUILD] + "?)?)?";
  tok("XRANGEPLAINLOOSE");
  src[t2.XRANGEPLAINLOOSE] = "[v=\\s]*(" + src[t2.XRANGEIDENTIFIERLOOSE] + ")(?:\\.(" + src[t2.XRANGEIDENTIFIERLOOSE] + ")(?:\\.(" + src[t2.XRANGEIDENTIFIERLOOSE] + ")(?:" + src[t2.PRERELEASELOOSE] + ")?" + src[t2.BUILD] + "?)?)?";
  tok("XRANGE");
  src[t2.XRANGE] = "^" + src[t2.GTLT] + "\\s*" + src[t2.XRANGEPLAIN] + "$";
  tok("XRANGELOOSE");
  src[t2.XRANGELOOSE] = "^" + src[t2.GTLT] + "\\s*" + src[t2.XRANGEPLAINLOOSE] + "$";
  tok("COERCE");
  src[t2.COERCE] = "(^|[^\\d])(\\d{1," + MAX_SAFE_COMPONENT_LENGTH2 + "})(?:\\.(\\d{1," + MAX_SAFE_COMPONENT_LENGTH2 + "}))?(?:\\.(\\d{1," + MAX_SAFE_COMPONENT_LENGTH2 + "}))?(?:$|[^\\d])";
  tok("COERCERTL");
  re2[t2.COERCERTL] = new RegExp(src[t2.COERCE], "g");
  safeRe[t2.COERCERTL] = new RegExp(makeSafeRe(src[t2.COERCE]), "g");
  tok("LONETILDE");
  src[t2.LONETILDE] = "(?:~>?)";
  tok("TILDETRIM");
  src[t2.TILDETRIM] = "(\\s*)" + src[t2.LONETILDE] + "\\s+";
  re2[t2.TILDETRIM] = new RegExp(src[t2.TILDETRIM], "g");
  safeRe[t2.TILDETRIM] = new RegExp(makeSafeRe(src[t2.TILDETRIM]), "g");
  var tildeTrimReplace = "$1~";
  tok("TILDE");
  src[t2.TILDE] = "^" + src[t2.LONETILDE] + src[t2.XRANGEPLAIN] + "$";
  tok("TILDELOOSE");
  src[t2.TILDELOOSE] = "^" + src[t2.LONETILDE] + src[t2.XRANGEPLAINLOOSE] + "$";
  tok("LONECARET");
  src[t2.LONECARET] = "(?:\\^)";
  tok("CARETTRIM");
  src[t2.CARETTRIM] = "(\\s*)" + src[t2.LONECARET] + "\\s+";
  re2[t2.CARETTRIM] = new RegExp(src[t2.CARETTRIM], "g");
  safeRe[t2.CARETTRIM] = new RegExp(makeSafeRe(src[t2.CARETTRIM]), "g");
  var caretTrimReplace = "$1^";
  tok("CARET");
  src[t2.CARET] = "^" + src[t2.LONECARET] + src[t2.XRANGEPLAIN] + "$";
  tok("CARETLOOSE");
  src[t2.CARETLOOSE] = "^" + src[t2.LONECARET] + src[t2.XRANGEPLAINLOOSE] + "$";
  tok("COMPARATORLOOSE");
  src[t2.COMPARATORLOOSE] = "^" + src[t2.GTLT] + "\\s*(" + src[t2.LOOSEPLAIN] + ")$|^$";
  tok("COMPARATOR");
  src[t2.COMPARATOR] = "^" + src[t2.GTLT] + "\\s*(" + src[t2.FULLPLAIN] + ")$|^$";
  tok("COMPARATORTRIM");
  src[t2.COMPARATORTRIM] = "(\\s*)" + src[t2.GTLT] + "\\s*(" + src[t2.LOOSEPLAIN] + "|" + src[t2.XRANGEPLAIN] + ")";
  re2[t2.COMPARATORTRIM] = new RegExp(src[t2.COMPARATORTRIM], "g");
  safeRe[t2.COMPARATORTRIM] = new RegExp(makeSafeRe(src[t2.COMPARATORTRIM]), "g");
  var comparatorTrimReplace = "$1$2$3";
  tok("HYPHENRANGE");
  src[t2.HYPHENRANGE] = "^\\s*(" + src[t2.XRANGEPLAIN] + ")\\s+-\\s+(" + src[t2.XRANGEPLAIN] + ")\\s*$";
  tok("HYPHENRANGELOOSE");
  src[t2.HYPHENRANGELOOSE] = "^\\s*(" + src[t2.XRANGEPLAINLOOSE] + ")\\s+-\\s+(" + src[t2.XRANGEPLAINLOOSE] + ")\\s*$";
  tok("STAR");
  src[t2.STAR] = "(<|>)?=?\\s*\\*";
  for (var i = 0; i < R; i++) {
    debug2(i, src[i]);
    if (!re2[i]) {
      re2[i] = new RegExp(src[i]);
      safeRe[i] = new RegExp(makeSafeRe(src[i]));
    }
  }
  exports.parse = parse2;
  function parse2(version2, options) {
    if (!options || typeof options !== "object") {
      options = {
        loose: !!options,
        includePrerelease: false
      };
    }
    if (version2 instanceof SemVer3) {
      return version2;
    }
    if (typeof version2 !== "string") {
      return null;
    }
    if (version2.length > MAX_LENGTH2) {
      return null;
    }
    var r = options.loose ? safeRe[t2.LOOSE] : safeRe[t2.FULL];
    if (!r.test(version2)) {
      return null;
    }
    try {
      return new SemVer3(version2, options);
    } catch (er) {
      return null;
    }
  }
  exports.valid = valid2;
  function valid2(version2, options) {
    var v = parse2(version2, options);
    return v ? v.version : null;
  }
  exports.clean = clean2;
  function clean2(version2, options) {
    var s = parse2(version2.trim().replace(/^[=v]+/, ""), options);
    return s ? s.version : null;
  }
  exports.SemVer = SemVer3;
  function SemVer3(version2, options) {
    if (!options || typeof options !== "object") {
      options = {
        loose: !!options,
        includePrerelease: false
      };
    }
    if (version2 instanceof SemVer3) {
      if (version2.loose === options.loose) {
        return version2;
      } else {
        version2 = version2.version;
      }
    } else if (typeof version2 !== "string") {
      throw new TypeError("Invalid Version: " + version2);
    }
    if (version2.length > MAX_LENGTH2) {
      throw new TypeError("version is longer than " + MAX_LENGTH2 + " characters");
    }
    if (!(this instanceof SemVer3)) {
      return new SemVer3(version2, options);
    }
    debug2("SemVer", version2, options);
    this.options = options;
    this.loose = !!options.loose;
    var m = version2.trim().match(options.loose ? safeRe[t2.LOOSE] : safeRe[t2.FULL]);
    if (!m) {
      throw new TypeError("Invalid Version: " + version2);
    }
    this.raw = version2;
    this.major = +m[1];
    this.minor = +m[2];
    this.patch = +m[3];
    if (this.major > MAX_SAFE_INTEGER2 || this.major < 0) {
      throw new TypeError("Invalid major version");
    }
    if (this.minor > MAX_SAFE_INTEGER2 || this.minor < 0) {
      throw new TypeError("Invalid minor version");
    }
    if (this.patch > MAX_SAFE_INTEGER2 || this.patch < 0) {
      throw new TypeError("Invalid patch version");
    }
    if (!m[4]) {
      this.prerelease = [];
    } else {
      this.prerelease = m[4].split(".").map(function(id2) {
        if (/^[0-9]+$/.test(id2)) {
          var num = +id2;
          if (num >= 0 && num < MAX_SAFE_INTEGER2) {
            return num;
          }
        }
        return id2;
      });
    }
    this.build = m[5] ? m[5].split(".") : [];
    this.format();
  }
  SemVer3.prototype.format = function() {
    this.version = this.major + "." + this.minor + "." + this.patch;
    if (this.prerelease.length) {
      this.version += "-" + this.prerelease.join(".");
    }
    return this.version;
  };
  SemVer3.prototype.toString = function() {
    return this.version;
  };
  SemVer3.prototype.compare = function(other) {
    debug2("SemVer.compare", this.version, this.options, other);
    if (!(other instanceof SemVer3)) {
      other = new SemVer3(other, this.options);
    }
    return this.compareMain(other) || this.comparePre(other);
  };
  SemVer3.prototype.compareMain = function(other) {
    if (!(other instanceof SemVer3)) {
      other = new SemVer3(other, this.options);
    }
    return compareIdentifiers2(this.major, other.major) || compareIdentifiers2(this.minor, other.minor) || compareIdentifiers2(this.patch, other.patch);
  };
  SemVer3.prototype.comparePre = function(other) {
    if (!(other instanceof SemVer3)) {
      other = new SemVer3(other, this.options);
    }
    if (this.prerelease.length && !other.prerelease.length) {
      return -1;
    } else if (!this.prerelease.length && other.prerelease.length) {
      return 1;
    } else if (!this.prerelease.length && !other.prerelease.length) {
      return 0;
    }
    var i2 = 0;
    do {
      var a = this.prerelease[i2];
      var b = other.prerelease[i2];
      debug2("prerelease compare", i2, a, b);
      if (a === void 0 && b === void 0) {
        return 0;
      } else if (b === void 0) {
        return 1;
      } else if (a === void 0) {
        return -1;
      } else if (a === b) {
        continue;
      } else {
        return compareIdentifiers2(a, b);
      }
    } while (++i2);
  };
  SemVer3.prototype.compareBuild = function(other) {
    if (!(other instanceof SemVer3)) {
      other = new SemVer3(other, this.options);
    }
    var i2 = 0;
    do {
      var a = this.build[i2];
      var b = other.build[i2];
      debug2("prerelease compare", i2, a, b);
      if (a === void 0 && b === void 0) {
        return 0;
      } else if (b === void 0) {
        return 1;
      } else if (a === void 0) {
        return -1;
      } else if (a === b) {
        continue;
      } else {
        return compareIdentifiers2(a, b);
      }
    } while (++i2);
  };
  SemVer3.prototype.inc = function(release, identifier) {
    switch (release) {
      case "premajor":
        this.prerelease.length = 0;
        this.patch = 0;
        this.minor = 0;
        this.major++;
        this.inc("pre", identifier);
        break;
      case "preminor":
        this.prerelease.length = 0;
        this.patch = 0;
        this.minor++;
        this.inc("pre", identifier);
        break;
      case "prepatch":
        this.prerelease.length = 0;
        this.inc("patch", identifier);
        this.inc("pre", identifier);
        break;
      case "prerelease":
        if (this.prerelease.length === 0) {
          this.inc("patch", identifier);
        }
        this.inc("pre", identifier);
        break;
      case "major":
        if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
          this.major++;
        }
        this.minor = 0;
        this.patch = 0;
        this.prerelease = [];
        break;
      case "minor":
        if (this.patch !== 0 || this.prerelease.length === 0) {
          this.minor++;
        }
        this.patch = 0;
        this.prerelease = [];
        break;
      case "patch":
        if (this.prerelease.length === 0) {
          this.patch++;
        }
        this.prerelease = [];
        break;
      case "pre":
        if (this.prerelease.length === 0) {
          this.prerelease = [0];
        } else {
          var i2 = this.prerelease.length;
          while (--i2 >= 0) {
            if (typeof this.prerelease[i2] === "number") {
              this.prerelease[i2]++;
              i2 = -2;
            }
          }
          if (i2 === -1) {
            this.prerelease.push(0);
          }
        }
        if (identifier) {
          if (this.prerelease[0] === identifier) {
            if (isNaN(this.prerelease[1])) {
              this.prerelease = [identifier, 0];
            }
          } else {
            this.prerelease = [identifier, 0];
          }
        }
        break;
      default:
        throw new Error("invalid increment argument: " + release);
    }
    this.format();
    this.raw = this.version;
    return this;
  };
  exports.inc = inc2;
  function inc2(version2, release, loose, identifier) {
    if (typeof loose === "string") {
      identifier = loose;
      loose = void 0;
    }
    try {
      return new SemVer3(version2, loose).inc(release, identifier).version;
    } catch (er) {
      return null;
    }
  }
  exports.diff = diff2;
  function diff2(version1, version2) {
    if (eq2(version1, version2)) {
      return null;
    } else {
      var v1 = parse2(version1);
      var v2 = parse2(version2);
      var prefix = "";
      if (v1.prerelease.length || v2.prerelease.length) {
        prefix = "pre";
        var defaultResult = "prerelease";
      }
      for (var key in v1) {
        if (key === "major" || key === "minor" || key === "patch") {
          if (v1[key] !== v2[key]) {
            return prefix + key;
          }
        }
      }
      return defaultResult;
    }
  }
  exports.compareIdentifiers = compareIdentifiers2;
  var numeric2 = /^[0-9]+$/;
  function compareIdentifiers2(a, b) {
    var anum = numeric2.test(a);
    var bnum = numeric2.test(b);
    if (anum && bnum) {
      a = +a;
      b = +b;
    }
    return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
  }
  exports.rcompareIdentifiers = rcompareIdentifiers2;
  function rcompareIdentifiers2(a, b) {
    return compareIdentifiers2(b, a);
  }
  exports.major = major2;
  function major2(a, loose) {
    return new SemVer3(a, loose).major;
  }
  exports.minor = minor2;
  function minor2(a, loose) {
    return new SemVer3(a, loose).minor;
  }
  exports.patch = patch2;
  function patch2(a, loose) {
    return new SemVer3(a, loose).patch;
  }
  exports.compare = compare2;
  function compare2(a, b, loose) {
    return new SemVer3(a, loose).compare(new SemVer3(b, loose));
  }
  exports.compareLoose = compareLoose2;
  function compareLoose2(a, b) {
    return compare2(a, b, true);
  }
  exports.compareBuild = compareBuild2;
  function compareBuild2(a, b, loose) {
    var versionA = new SemVer3(a, loose);
    var versionB = new SemVer3(b, loose);
    return versionA.compare(versionB) || versionA.compareBuild(versionB);
  }
  exports.rcompare = rcompare2;
  function rcompare2(a, b, loose) {
    return compare2(b, a, loose);
  }
  exports.sort = sort2;
  function sort2(list, loose) {
    return list.sort(function(a, b) {
      return exports.compareBuild(a, b, loose);
    });
  }
  exports.rsort = rsort2;
  function rsort2(list, loose) {
    return list.sort(function(a, b) {
      return exports.compareBuild(b, a, loose);
    });
  }
  exports.gt = gt2;
  function gt2(a, b, loose) {
    return compare2(a, b, loose) > 0;
  }
  exports.lt = lt2;
  function lt2(a, b, loose) {
    return compare2(a, b, loose) < 0;
  }
  exports.eq = eq2;
  function eq2(a, b, loose) {
    return compare2(a, b, loose) === 0;
  }
  exports.neq = neq2;
  function neq2(a, b, loose) {
    return compare2(a, b, loose) !== 0;
  }
  exports.gte = gte2;
  function gte2(a, b, loose) {
    return compare2(a, b, loose) >= 0;
  }
  exports.lte = lte2;
  function lte2(a, b, loose) {
    return compare2(a, b, loose) <= 0;
  }
  exports.cmp = cmp2;
  function cmp2(a, op, b, loose) {
    switch (op) {
      case "===":
        if (typeof a === "object")
          a = a.version;
        if (typeof b === "object")
          b = b.version;
        return a === b;
      case "!==":
        if (typeof a === "object")
          a = a.version;
        if (typeof b === "object")
          b = b.version;
        return a !== b;
      case "":
      case "=":
      case "==":
        return eq2(a, b, loose);
      case "!=":
        return neq2(a, b, loose);
      case ">":
        return gt2(a, b, loose);
      case ">=":
        return gte2(a, b, loose);
      case "<":
        return lt2(a, b, loose);
      case "<=":
        return lte2(a, b, loose);
      default:
        throw new TypeError("Invalid operator: " + op);
    }
  }
  exports.Comparator = Comparator2;
  function Comparator2(comp, options) {
    if (!options || typeof options !== "object") {
      options = {
        loose: !!options,
        includePrerelease: false
      };
    }
    if (comp instanceof Comparator2) {
      if (comp.loose === !!options.loose) {
        return comp;
      } else {
        comp = comp.value;
      }
    }
    if (!(this instanceof Comparator2)) {
      return new Comparator2(comp, options);
    }
    comp = comp.trim().split(/\s+/).join(" ");
    debug2("comparator", comp, options);
    this.options = options;
    this.loose = !!options.loose;
    this.parse(comp);
    if (this.semver === ANY2) {
      this.value = "";
    } else {
      this.value = this.operator + this.semver.version;
    }
    debug2("comp", this);
  }
  var ANY2 = {};
  Comparator2.prototype.parse = function(comp) {
    var r = this.options.loose ? safeRe[t2.COMPARATORLOOSE] : safeRe[t2.COMPARATOR];
    var m = comp.match(r);
    if (!m) {
      throw new TypeError("Invalid comparator: " + comp);
    }
    this.operator = m[1] !== void 0 ? m[1] : "";
    if (this.operator === "=") {
      this.operator = "";
    }
    if (!m[2]) {
      this.semver = ANY2;
    } else {
      this.semver = new SemVer3(m[2], this.options.loose);
    }
  };
  Comparator2.prototype.toString = function() {
    return this.value;
  };
  Comparator2.prototype.test = function(version2) {
    debug2("Comparator.test", version2, this.options.loose);
    if (this.semver === ANY2 || version2 === ANY2) {
      return true;
    }
    if (typeof version2 === "string") {
      try {
        version2 = new SemVer3(version2, this.options);
      } catch (er) {
        return false;
      }
    }
    return cmp2(version2, this.operator, this.semver, this.options);
  };
  Comparator2.prototype.intersects = function(comp, options) {
    if (!(comp instanceof Comparator2)) {
      throw new TypeError("a Comparator is required");
    }
    if (!options || typeof options !== "object") {
      options = {
        loose: !!options,
        includePrerelease: false
      };
    }
    var rangeTmp;
    if (this.operator === "") {
      if (this.value === "") {
        return true;
      }
      rangeTmp = new Range2(comp.value, options);
      return satisfies2(this.value, rangeTmp, options);
    } else if (comp.operator === "") {
      if (comp.value === "") {
        return true;
      }
      rangeTmp = new Range2(this.value, options);
      return satisfies2(comp.semver, rangeTmp, options);
    }
    var sameDirectionIncreasing = (this.operator === ">=" || this.operator === ">") && (comp.operator === ">=" || comp.operator === ">");
    var sameDirectionDecreasing = (this.operator === "<=" || this.operator === "<") && (comp.operator === "<=" || comp.operator === "<");
    var sameSemVer = this.semver.version === comp.semver.version;
    var differentDirectionsInclusive = (this.operator === ">=" || this.operator === "<=") && (comp.operator === ">=" || comp.operator === "<=");
    var oppositeDirectionsLessThan = cmp2(this.semver, "<", comp.semver, options) && ((this.operator === ">=" || this.operator === ">") && (comp.operator === "<=" || comp.operator === "<"));
    var oppositeDirectionsGreaterThan = cmp2(this.semver, ">", comp.semver, options) && ((this.operator === "<=" || this.operator === "<") && (comp.operator === ">=" || comp.operator === ">"));
    return sameDirectionIncreasing || sameDirectionDecreasing || sameSemVer && differentDirectionsInclusive || oppositeDirectionsLessThan || oppositeDirectionsGreaterThan;
  };
  exports.Range = Range2;
  function Range2(range2, options) {
    if (!options || typeof options !== "object") {
      options = {
        loose: !!options,
        includePrerelease: false
      };
    }
    if (range2 instanceof Range2) {
      if (range2.loose === !!options.loose && range2.includePrerelease === !!options.includePrerelease) {
        return range2;
      } else {
        return new Range2(range2.raw, options);
      }
    }
    if (range2 instanceof Comparator2) {
      return new Range2(range2.value, options);
    }
    if (!(this instanceof Range2)) {
      return new Range2(range2, options);
    }
    this.options = options;
    this.loose = !!options.loose;
    this.includePrerelease = !!options.includePrerelease;
    this.raw = range2.trim().split(/\s+/).join(" ");
    this.set = this.raw.split("||").map(function(range22) {
      return this.parseRange(range22.trim());
    }, this).filter(function(c) {
      return c.length;
    });
    if (!this.set.length) {
      throw new TypeError("Invalid SemVer Range: " + this.raw);
    }
    this.format();
  }
  Range2.prototype.format = function() {
    this.range = this.set.map(function(comps) {
      return comps.join(" ").trim();
    }).join("||").trim();
    return this.range;
  };
  Range2.prototype.toString = function() {
    return this.range;
  };
  Range2.prototype.parseRange = function(range2) {
    var loose = this.options.loose;
    var hr = loose ? safeRe[t2.HYPHENRANGELOOSE] : safeRe[t2.HYPHENRANGE];
    range2 = range2.replace(hr, hyphenReplace);
    debug2("hyphen replace", range2);
    range2 = range2.replace(safeRe[t2.COMPARATORTRIM], comparatorTrimReplace);
    debug2("comparator trim", range2, safeRe[t2.COMPARATORTRIM]);
    range2 = range2.replace(safeRe[t2.TILDETRIM], tildeTrimReplace);
    range2 = range2.replace(safeRe[t2.CARETTRIM], caretTrimReplace);
    range2 = range2.split(/\s+/).join(" ");
    var compRe = loose ? safeRe[t2.COMPARATORLOOSE] : safeRe[t2.COMPARATOR];
    var set = range2.split(" ").map(function(comp) {
      return parseComparator(comp, this.options);
    }, this).join(" ").split(/\s+/);
    if (this.options.loose) {
      set = set.filter(function(comp) {
        return !!comp.match(compRe);
      });
    }
    set = set.map(function(comp) {
      return new Comparator2(comp, this.options);
    }, this);
    return set;
  };
  Range2.prototype.intersects = function(range2, options) {
    if (!(range2 instanceof Range2)) {
      throw new TypeError("a Range is required");
    }
    return this.set.some(function(thisComparators) {
      return isSatisfiable(thisComparators, options) && range2.set.some(function(rangeComparators) {
        return isSatisfiable(rangeComparators, options) && thisComparators.every(function(thisComparator) {
          return rangeComparators.every(function(rangeComparator) {
            return thisComparator.intersects(rangeComparator, options);
          });
        });
      });
    });
  };
  function isSatisfiable(comparators, options) {
    var result = true;
    var remainingComparators = comparators.slice();
    var testComparator = remainingComparators.pop();
    while (result && remainingComparators.length) {
      result = remainingComparators.every(function(otherComparator) {
        return testComparator.intersects(otherComparator, options);
      });
      testComparator = remainingComparators.pop();
    }
    return result;
  }
  exports.toComparators = toComparators2;
  function toComparators2(range2, options) {
    return new Range2(range2, options).set.map(function(comp) {
      return comp.map(function(c) {
        return c.value;
      }).join(" ").trim().split(" ");
    });
  }
  function parseComparator(comp, options) {
    debug2("comp", comp, options);
    comp = replaceCarets(comp, options);
    debug2("caret", comp);
    comp = replaceTildes(comp, options);
    debug2("tildes", comp);
    comp = replaceXRanges(comp, options);
    debug2("xrange", comp);
    comp = replaceStars(comp, options);
    debug2("stars", comp);
    return comp;
  }
  function isX(id2) {
    return !id2 || id2.toLowerCase() === "x" || id2 === "*";
  }
  function replaceTildes(comp, options) {
    return comp.trim().split(/\s+/).map(function(comp2) {
      return replaceTilde(comp2, options);
    }).join(" ");
  }
  function replaceTilde(comp, options) {
    var r = options.loose ? safeRe[t2.TILDELOOSE] : safeRe[t2.TILDE];
    return comp.replace(r, function(_, M, m, p, pr) {
      debug2("tilde", comp, _, M, m, p, pr);
      var ret;
      if (isX(M)) {
        ret = "";
      } else if (isX(m)) {
        ret = ">=" + M + ".0.0 <" + (+M + 1) + ".0.0";
      } else if (isX(p)) {
        ret = ">=" + M + "." + m + ".0 <" + M + "." + (+m + 1) + ".0";
      } else if (pr) {
        debug2("replaceTilde pr", pr);
        ret = ">=" + M + "." + m + "." + p + "-" + pr + " <" + M + "." + (+m + 1) + ".0";
      } else {
        ret = ">=" + M + "." + m + "." + p + " <" + M + "." + (+m + 1) + ".0";
      }
      debug2("tilde return", ret);
      return ret;
    });
  }
  function replaceCarets(comp, options) {
    return comp.trim().split(/\s+/).map(function(comp2) {
      return replaceCaret(comp2, options);
    }).join(" ");
  }
  function replaceCaret(comp, options) {
    debug2("caret", comp, options);
    var r = options.loose ? safeRe[t2.CARETLOOSE] : safeRe[t2.CARET];
    return comp.replace(r, function(_, M, m, p, pr) {
      debug2("caret", comp, _, M, m, p, pr);
      var ret;
      if (isX(M)) {
        ret = "";
      } else if (isX(m)) {
        ret = ">=" + M + ".0.0 <" + (+M + 1) + ".0.0";
      } else if (isX(p)) {
        if (M === "0") {
          ret = ">=" + M + "." + m + ".0 <" + M + "." + (+m + 1) + ".0";
        } else {
          ret = ">=" + M + "." + m + ".0 <" + (+M + 1) + ".0.0";
        }
      } else if (pr) {
        debug2("replaceCaret pr", pr);
        if (M === "0") {
          if (m === "0") {
            ret = ">=" + M + "." + m + "." + p + "-" + pr + " <" + M + "." + m + "." + (+p + 1);
          } else {
            ret = ">=" + M + "." + m + "." + p + "-" + pr + " <" + M + "." + (+m + 1) + ".0";
          }
        } else {
          ret = ">=" + M + "." + m + "." + p + "-" + pr + " <" + (+M + 1) + ".0.0";
        }
      } else {
        debug2("no pr");
        if (M === "0") {
          if (m === "0") {
            ret = ">=" + M + "." + m + "." + p + " <" + M + "." + m + "." + (+p + 1);
          } else {
            ret = ">=" + M + "." + m + "." + p + " <" + M + "." + (+m + 1) + ".0";
          }
        } else {
          ret = ">=" + M + "." + m + "." + p + " <" + (+M + 1) + ".0.0";
        }
      }
      debug2("caret return", ret);
      return ret;
    });
  }
  function replaceXRanges(comp, options) {
    debug2("replaceXRanges", comp, options);
    return comp.split(/\s+/).map(function(comp2) {
      return replaceXRange(comp2, options);
    }).join(" ");
  }
  function replaceXRange(comp, options) {
    comp = comp.trim();
    var r = options.loose ? safeRe[t2.XRANGELOOSE] : safeRe[t2.XRANGE];
    return comp.replace(r, function(ret, gtlt, M, m, p, pr) {
      debug2("xRange", comp, ret, gtlt, M, m, p, pr);
      var xM = isX(M);
      var xm = xM || isX(m);
      var xp = xm || isX(p);
      var anyX = xp;
      if (gtlt === "=" && anyX) {
        gtlt = "";
      }
      pr = options.includePrerelease ? "-0" : "";
      if (xM) {
        if (gtlt === ">" || gtlt === "<") {
          ret = "<0.0.0-0";
        } else {
          ret = "*";
        }
      } else if (gtlt && anyX) {
        if (xm) {
          m = 0;
        }
        p = 0;
        if (gtlt === ">") {
          gtlt = ">=";
          if (xm) {
            M = +M + 1;
            m = 0;
            p = 0;
          } else {
            m = +m + 1;
            p = 0;
          }
        } else if (gtlt === "<=") {
          gtlt = "<";
          if (xm) {
            M = +M + 1;
          } else {
            m = +m + 1;
          }
        }
        ret = gtlt + M + "." + m + "." + p + pr;
      } else if (xm) {
        ret = ">=" + M + ".0.0" + pr + " <" + (+M + 1) + ".0.0" + pr;
      } else if (xp) {
        ret = ">=" + M + "." + m + ".0" + pr + " <" + M + "." + (+m + 1) + ".0" + pr;
      }
      debug2("xRange return", ret);
      return ret;
    });
  }
  function replaceStars(comp, options) {
    debug2("replaceStars", comp, options);
    return comp.trim().replace(safeRe[t2.STAR], "");
  }
  function hyphenReplace($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr, tb) {
    if (isX(fM)) {
      from = "";
    } else if (isX(fm)) {
      from = ">=" + fM + ".0.0";
    } else if (isX(fp)) {
      from = ">=" + fM + "." + fm + ".0";
    } else {
      from = ">=" + from;
    }
    if (isX(tM)) {
      to = "";
    } else if (isX(tm)) {
      to = "<" + (+tM + 1) + ".0.0";
    } else if (isX(tp)) {
      to = "<" + tM + "." + (+tm + 1) + ".0";
    } else if (tpr) {
      to = "<=" + tM + "." + tm + "." + tp + "-" + tpr;
    } else {
      to = "<=" + to;
    }
    return (from + " " + to).trim();
  }
  Range2.prototype.test = function(version2) {
    if (!version2) {
      return false;
    }
    if (typeof version2 === "string") {
      try {
        version2 = new SemVer3(version2, this.options);
      } catch (er) {
        return false;
      }
    }
    for (var i2 = 0; i2 < this.set.length; i2++) {
      if (testSet(this.set[i2], version2, this.options)) {
        return true;
      }
    }
    return false;
  };
  function testSet(set, version2, options) {
    for (var i2 = 0; i2 < set.length; i2++) {
      if (!set[i2].test(version2)) {
        return false;
      }
    }
    if (version2.prerelease.length && !options.includePrerelease) {
      for (i2 = 0; i2 < set.length; i2++) {
        debug2(set[i2].semver);
        if (set[i2].semver === ANY2) {
          continue;
        }
        if (set[i2].semver.prerelease.length > 0) {
          var allowed = set[i2].semver;
          if (allowed.major === version2.major && allowed.minor === version2.minor && allowed.patch === version2.patch) {
            return true;
          }
        }
      }
      return false;
    }
    return true;
  }
  exports.satisfies = satisfies2;
  function satisfies2(version2, range2, options) {
    try {
      range2 = new Range2(range2, options);
    } catch (er) {
      return false;
    }
    return range2.test(version2);
  }
  exports.maxSatisfying = maxSatisfying2;
  function maxSatisfying2(versions, range2, options) {
    var max = null;
    var maxSV = null;
    try {
      var rangeObj = new Range2(range2, options);
    } catch (er) {
      return null;
    }
    versions.forEach(function(v) {
      if (rangeObj.test(v)) {
        if (!max || maxSV.compare(v) === -1) {
          max = v;
          maxSV = new SemVer3(max, options);
        }
      }
    });
    return max;
  }
  exports.minSatisfying = minSatisfying2;
  function minSatisfying2(versions, range2, options) {
    var min = null;
    var minSV = null;
    try {
      var rangeObj = new Range2(range2, options);
    } catch (er) {
      return null;
    }
    versions.forEach(function(v) {
      if (rangeObj.test(v)) {
        if (!min || minSV.compare(v) === 1) {
          min = v;
          minSV = new SemVer3(min, options);
        }
      }
    });
    return min;
  }
  exports.minVersion = minVersion2;
  function minVersion2(range2, loose) {
    range2 = new Range2(range2, loose);
    var minver = new SemVer3("0.0.0");
    if (range2.test(minver)) {
      return minver;
    }
    minver = new SemVer3("0.0.0-0");
    if (range2.test(minver)) {
      return minver;
    }
    minver = null;
    for (var i2 = 0; i2 < range2.set.length; ++i2) {
      var comparators = range2.set[i2];
      comparators.forEach(function(comparator2) {
        var compver = new SemVer3(comparator2.semver.version);
        switch (comparator2.operator) {
          case ">":
            if (compver.prerelease.length === 0) {
              compver.patch++;
            } else {
              compver.prerelease.push(0);
            }
            compver.raw = compver.format();
          case "":
          case ">=":
            if (!minver || gt2(minver, compver)) {
              minver = compver;
            }
            break;
          case "<":
          case "<=":
            break;
          default:
            throw new Error("Unexpected operation: " + comparator2.operator);
        }
      });
    }
    if (minver && range2.test(minver)) {
      return minver;
    }
    return null;
  }
  exports.validRange = validRange2;
  function validRange2(range2, options) {
    try {
      return new Range2(range2, options).range || "*";
    } catch (er) {
      return null;
    }
  }
  exports.ltr = ltr2;
  function ltr2(version2, range2, options) {
    return outside2(version2, range2, "<", options);
  }
  exports.gtr = gtr2;
  function gtr2(version2, range2, options) {
    return outside2(version2, range2, ">", options);
  }
  exports.outside = outside2;
  function outside2(version2, range2, hilo, options) {
    version2 = new SemVer3(version2, options);
    range2 = new Range2(range2, options);
    var gtfn, ltefn, ltfn, comp, ecomp;
    switch (hilo) {
      case ">":
        gtfn = gt2;
        ltefn = lte2;
        ltfn = lt2;
        comp = ">";
        ecomp = ">=";
        break;
      case "<":
        gtfn = lt2;
        ltefn = gte2;
        ltfn = gt2;
        comp = "<";
        ecomp = "<=";
        break;
      default:
        throw new TypeError('Must provide a hilo val of "<" or ">"');
    }
    if (satisfies2(version2, range2, options)) {
      return false;
    }
    for (var i2 = 0; i2 < range2.set.length; ++i2) {
      var comparators = range2.set[i2];
      var high = null;
      var low = null;
      comparators.forEach(function(comparator2) {
        if (comparator2.semver === ANY2) {
          comparator2 = new Comparator2(">=0.0.0");
        }
        high = high || comparator2;
        low = low || comparator2;
        if (gtfn(comparator2.semver, high.semver, options)) {
          high = comparator2;
        } else if (ltfn(comparator2.semver, low.semver, options)) {
          low = comparator2;
        }
      });
      if (high.operator === comp || high.operator === ecomp) {
        return false;
      }
      if ((!low.operator || low.operator === comp) && ltefn(version2, low.semver)) {
        return false;
      } else if (low.operator === ecomp && ltfn(version2, low.semver)) {
        return false;
      }
    }
    return true;
  }
  exports.prerelease = prerelease2;
  function prerelease2(version2, options) {
    var parsed = parse2(version2, options);
    return parsed && parsed.prerelease.length ? parsed.prerelease : null;
  }
  exports.intersects = intersects2;
  function intersects2(r1, r2, options) {
    r1 = new Range2(r1, options);
    r2 = new Range2(r2, options);
    return r1.intersects(r2);
  }
  exports.coerce = coerce2;
  function coerce2(version2, options) {
    if (version2 instanceof SemVer3) {
      return version2;
    }
    if (typeof version2 === "number") {
      version2 = String(version2);
    }
    if (typeof version2 !== "string") {
      return null;
    }
    options = options || {};
    var match = null;
    if (!options.rtl) {
      match = version2.match(safeRe[t2.COERCE]);
    } else {
      var next;
      while ((next = safeRe[t2.COERCERTL].exec(version2)) && (!match || match.index + match[0].length !== version2.length)) {
        if (!match || next.index + next[0].length !== match.index + match[0].length) {
          match = next;
        }
        safeRe[t2.COERCERTL].lastIndex = next.index + next[1].length + next[2].length;
      }
      safeRe[t2.COERCERTL].lastIndex = -1;
    }
    if (match === null) {
      return null;
    }
    return parse2(match[2] + "." + (match[3] || "0") + "." + (match[4] || "0"), options);
  }
})(semver$3, semver$3.exports);
var semverExports = semver$3.exports;
const fs$3 = fs$4;
const path$6 = path$7;
const { promisify } = require$$2;
const semver$2 = semverExports;
const useNativeRecursiveOption = semver$2.satisfies(process.version, ">=10.12.0");
const checkPath = (pth2) => {
  if (process.platform === "win32") {
    const pathHasInvalidWinCharacters = /[<>:"|?*]/.test(pth2.replace(path$6.parse(pth2).root, ""));
    if (pathHasInvalidWinCharacters) {
      const error2 = new Error(`Path contains invalid characters: ${pth2}`);
      error2.code = "EINVAL";
      throw error2;
    }
  }
};
const processOptions = (options) => {
  const defaults2 = {
    mode: 511,
    fs: fs$3
  };
  return {
    ...defaults2,
    ...options
  };
};
const permissionError = (pth2) => {
  const error2 = new Error(`operation not permitted, mkdir '${pth2}'`);
  error2.code = "EPERM";
  error2.errno = -4048;
  error2.path = pth2;
  error2.syscall = "mkdir";
  return error2;
};
const makeDir = async (input, options) => {
  checkPath(input);
  options = processOptions(options);
  const mkdir = promisify(options.fs.mkdir);
  const stat = promisify(options.fs.stat);
  if (useNativeRecursiveOption && options.fs.mkdir === fs$3.mkdir) {
    const pth2 = path$6.resolve(input);
    await mkdir(pth2, {
      mode: options.mode,
      recursive: true
    });
    return pth2;
  }
  const make = async (pth2) => {
    try {
      await mkdir(pth2, options.mode);
      return pth2;
    } catch (error2) {
      if (error2.code === "EPERM") {
        throw error2;
      }
      if (error2.code === "ENOENT") {
        if (path$6.dirname(pth2) === pth2) {
          throw permissionError(pth2);
        }
        if (error2.message.includes("null bytes")) {
          throw error2;
        }
        await make(path$6.dirname(pth2));
        return make(pth2);
      }
      try {
        const stats = await stat(pth2);
        if (!stats.isDirectory()) {
          throw new Error("The path is not a directory");
        }
      } catch (_) {
        throw error2;
      }
      return pth2;
    }
  };
  return make(path$6.resolve(input));
};
makeDir$1.exports = makeDir;
makeDir$1.exports.sync = (input, options) => {
  checkPath(input);
  options = processOptions(options);
  if (useNativeRecursiveOption && options.fs.mkdirSync === fs$3.mkdirSync) {
    const pth2 = path$6.resolve(input);
    fs$3.mkdirSync(pth2, {
      mode: options.mode,
      recursive: true
    });
    return pth2;
  }
  const make = (pth2) => {
    try {
      options.fs.mkdirSync(pth2, options.mode);
    } catch (error2) {
      if (error2.code === "EPERM") {
        throw error2;
      }
      if (error2.code === "ENOENT") {
        if (path$6.dirname(pth2) === pth2) {
          throw permissionError(pth2);
        }
        if (error2.message.includes("null bytes")) {
          throw error2;
        }
        make(path$6.dirname(pth2));
        return make(pth2);
      }
      try {
        if (!options.fs.statSync(pth2).isDirectory()) {
          throw new Error("The path is not a directory");
        }
      } catch (_) {
        throw error2;
      }
    }
    return pth2;
  };
  return make(path$6.resolve(input));
};
var makeDirExports = makeDir$1.exports;
var pkgUp = { exports: {} };
var findUp$1 = { exports: {} };
var locatePath$1 = { exports: {} };
var pathExists$1 = { exports: {} };
const fs$2 = fs$4;
pathExists$1.exports = (fp) => new Promise((resolve2) => {
  fs$2.access(fp, (err) => {
    resolve2(!err);
  });
});
pathExists$1.exports.sync = (fp) => {
  try {
    fs$2.accessSync(fp);
    return true;
  } catch (err) {
    return false;
  }
};
var pathExistsExports = pathExists$1.exports;
var pLimit$2 = { exports: {} };
var pTry$2 = { exports: {} };
const pTry$1 = (fn, ...arguments_) => new Promise((resolve2) => {
  resolve2(fn(...arguments_));
});
pTry$2.exports = pTry$1;
pTry$2.exports.default = pTry$1;
var pTryExports = pTry$2.exports;
const pTry = pTryExports;
const pLimit$1 = (concurrency) => {
  if (!((Number.isInteger(concurrency) || concurrency === Infinity) && concurrency > 0)) {
    return Promise.reject(new TypeError("Expected `concurrency` to be a number from 1 and up"));
  }
  const queue = [];
  let activeCount = 0;
  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      queue.shift()();
    }
  };
  const run = (fn, resolve2, ...args) => {
    activeCount++;
    const result = pTry(fn, ...args);
    resolve2(result);
    result.then(next, next);
  };
  const enqueue = (fn, resolve2, ...args) => {
    if (activeCount < concurrency) {
      run(fn, resolve2, ...args);
    } else {
      queue.push(run.bind(null, fn, resolve2, ...args));
    }
  };
  const generator = (fn, ...args) => new Promise((resolve2) => enqueue(fn, resolve2, ...args));
  Object.defineProperties(generator, {
    activeCount: {
      get: () => activeCount
    },
    pendingCount: {
      get: () => queue.length
    },
    clearQueue: {
      value: () => {
        queue.length = 0;
      }
    }
  });
  return generator;
};
pLimit$2.exports = pLimit$1;
pLimit$2.exports.default = pLimit$1;
var pLimitExports = pLimit$2.exports;
const pLimit = pLimitExports;
class EndError extends Error {
  constructor(value) {
    super();
    this.value = value;
  }
}
const testElement = (el, tester) => Promise.resolve(el).then(tester);
const finder = (el) => Promise.all(el).then((val) => val[1] === true && Promise.reject(new EndError(val[0])));
var pLocate$1 = (iterable, tester, opts) => {
  opts = Object.assign({
    concurrency: Infinity,
    preserveOrder: true
  }, opts);
  const limit2 = pLimit(opts.concurrency);
  const items2 = [...iterable].map((el) => [el, limit2(testElement, el, tester)]);
  const checkLimit = pLimit(opts.preserveOrder ? 1 : Infinity);
  return Promise.all(items2.map((el) => checkLimit(finder, el))).then(() => {
  }).catch((err) => err instanceof EndError ? err.value : Promise.reject(err));
};
const path$5 = path$7;
const pathExists = pathExistsExports;
const pLocate = pLocate$1;
locatePath$1.exports = (iterable, options) => {
  options = Object.assign({
    cwd: process.cwd()
  }, options);
  return pLocate(iterable, (el) => pathExists(path$5.resolve(options.cwd, el)), options);
};
locatePath$1.exports.sync = (iterable, options) => {
  options = Object.assign({
    cwd: process.cwd()
  }, options);
  for (const el of iterable) {
    if (pathExists.sync(path$5.resolve(options.cwd, el))) {
      return el;
    }
  }
};
var locatePathExports = locatePath$1.exports;
const path$4 = path$7;
const locatePath = locatePathExports;
findUp$1.exports = (filename, opts = {}) => {
  const startDir = path$4.resolve(opts.cwd || "");
  const { root } = path$4.parse(startDir);
  const filenames = [].concat(filename);
  return new Promise((resolve2) => {
    (function find(dir) {
      locatePath(filenames, { cwd: dir }).then((file) => {
        if (file) {
          resolve2(path$4.join(dir, file));
        } else if (dir === root) {
          resolve2(null);
        } else {
          find(path$4.dirname(dir));
        }
      });
    })(startDir);
  });
};
findUp$1.exports.sync = (filename, opts = {}) => {
  let dir = path$4.resolve(opts.cwd || "");
  const { root } = path$4.parse(dir);
  const filenames = [].concat(filename);
  while (true) {
    const file = locatePath.sync(filenames, { cwd: dir });
    if (file) {
      return path$4.join(dir, file);
    }
    if (dir === root) {
      return null;
    }
    dir = path$4.dirname(dir);
  }
};
var findUpExports = findUp$1.exports;
const findUp = findUpExports;
pkgUp.exports = async ({ cwd } = {}) => findUp("package.json", { cwd });
pkgUp.exports.sync = ({ cwd } = {}) => findUp.sync("package.json", { cwd });
var pkgUpExports = pkgUp.exports;
var envPaths$1 = { exports: {} };
const path$3 = path$7;
const os = require$$1;
const homedir = os.homedir();
const tmpdir = os.tmpdir();
const { env } = process;
const macos = (name) => {
  const library = path$3.join(homedir, "Library");
  return {
    data: path$3.join(library, "Application Support", name),
    config: path$3.join(library, "Preferences", name),
    cache: path$3.join(library, "Caches", name),
    log: path$3.join(library, "Logs", name),
    temp: path$3.join(tmpdir, name)
  };
};
const windows = (name) => {
  const appData = env.APPDATA || path$3.join(homedir, "AppData", "Roaming");
  const localAppData = env.LOCALAPPDATA || path$3.join(homedir, "AppData", "Local");
  return {
    // Data/config/cache/log are invented by me as Windows isn't opinionated about this
    data: path$3.join(localAppData, name, "Data"),
    config: path$3.join(appData, name, "Config"),
    cache: path$3.join(localAppData, name, "Cache"),
    log: path$3.join(localAppData, name, "Log"),
    temp: path$3.join(tmpdir, name)
  };
};
const linux = (name) => {
  const username = path$3.basename(homedir);
  return {
    data: path$3.join(env.XDG_DATA_HOME || path$3.join(homedir, ".local", "share"), name),
    config: path$3.join(env.XDG_CONFIG_HOME || path$3.join(homedir, ".config"), name),
    cache: path$3.join(env.XDG_CACHE_HOME || path$3.join(homedir, ".cache"), name),
    // https://wiki.debian.org/XDGBaseDirectorySpecification#state
    log: path$3.join(env.XDG_STATE_HOME || path$3.join(homedir, ".local", "state"), name),
    temp: path$3.join(tmpdir, username, name)
  };
};
const envPaths = (name, options) => {
  if (typeof name !== "string") {
    throw new TypeError(`Expected string, got ${typeof name}`);
  }
  options = Object.assign({ suffix: "nodejs" }, options);
  if (options.suffix) {
    name += `-${options.suffix}`;
  }
  if (process.platform === "darwin") {
    return macos(name);
  }
  if (process.platform === "win32") {
    return windows(name);
  }
  return linux(name);
};
envPaths$1.exports = envPaths;
envPaths$1.exports.default = envPaths;
var envPathsExports = envPaths$1.exports;
var dist$1 = {};
var consts = {};
Object.defineProperty(consts, "__esModule", { value: true });
consts.NOOP = consts.LIMIT_FILES_DESCRIPTORS = consts.LIMIT_BASENAME_LENGTH = consts.IS_USER_ROOT = consts.IS_POSIX = consts.DEFAULT_TIMEOUT_SYNC = consts.DEFAULT_TIMEOUT_ASYNC = consts.DEFAULT_WRITE_OPTIONS = consts.DEFAULT_READ_OPTIONS = consts.DEFAULT_FOLDER_MODE = consts.DEFAULT_FILE_MODE = consts.DEFAULT_ENCODING = void 0;
const DEFAULT_ENCODING = "utf8";
consts.DEFAULT_ENCODING = DEFAULT_ENCODING;
const DEFAULT_FILE_MODE = 438;
consts.DEFAULT_FILE_MODE = DEFAULT_FILE_MODE;
const DEFAULT_FOLDER_MODE = 511;
consts.DEFAULT_FOLDER_MODE = DEFAULT_FOLDER_MODE;
const DEFAULT_READ_OPTIONS = {};
consts.DEFAULT_READ_OPTIONS = DEFAULT_READ_OPTIONS;
const DEFAULT_WRITE_OPTIONS = {};
consts.DEFAULT_WRITE_OPTIONS = DEFAULT_WRITE_OPTIONS;
const DEFAULT_TIMEOUT_ASYNC = 5e3;
consts.DEFAULT_TIMEOUT_ASYNC = DEFAULT_TIMEOUT_ASYNC;
const DEFAULT_TIMEOUT_SYNC = 100;
consts.DEFAULT_TIMEOUT_SYNC = DEFAULT_TIMEOUT_SYNC;
const IS_POSIX = !!process.getuid;
consts.IS_POSIX = IS_POSIX;
const IS_USER_ROOT = process.getuid ? !process.getuid() : false;
consts.IS_USER_ROOT = IS_USER_ROOT;
const LIMIT_BASENAME_LENGTH = 128;
consts.LIMIT_BASENAME_LENGTH = LIMIT_BASENAME_LENGTH;
const LIMIT_FILES_DESCRIPTORS = 1e4;
consts.LIMIT_FILES_DESCRIPTORS = LIMIT_FILES_DESCRIPTORS;
const NOOP = () => {
};
consts.NOOP = NOOP;
var fs$1 = {};
var attemptify = {};
Object.defineProperty(attemptify, "__esModule", { value: true });
attemptify.attemptifySync = attemptify.attemptifyAsync = void 0;
const consts_1$4 = consts;
const attemptifyAsync = (fn, onError = consts_1$4.NOOP) => {
  return function() {
    return fn.apply(void 0, arguments).catch(onError);
  };
};
attemptify.attemptifyAsync = attemptifyAsync;
const attemptifySync = (fn, onError = consts_1$4.NOOP) => {
  return function() {
    try {
      return fn.apply(void 0, arguments);
    } catch (error2) {
      return onError(error2);
    }
  };
};
attemptify.attemptifySync = attemptifySync;
var fs_handlers = {};
Object.defineProperty(fs_handlers, "__esModule", { value: true });
const consts_1$3 = consts;
const Handlers = {
  isChangeErrorOk: (error2) => {
    const { code: code2 } = error2;
    if (code2 === "ENOSYS")
      return true;
    if (!consts_1$3.IS_USER_ROOT && (code2 === "EINVAL" || code2 === "EPERM"))
      return true;
    return false;
  },
  isRetriableError: (error2) => {
    const { code: code2 } = error2;
    if (code2 === "EMFILE" || code2 === "ENFILE" || code2 === "EAGAIN" || code2 === "EBUSY" || code2 === "EACCESS" || code2 === "EACCS" || code2 === "EPERM")
      return true;
    return false;
  },
  onChangeError: (error2) => {
    if (Handlers.isChangeErrorOk(error2))
      return;
    throw error2;
  }
};
fs_handlers.default = Handlers;
var retryify = {};
var retryify_queue = {};
Object.defineProperty(retryify_queue, "__esModule", { value: true });
const consts_1$2 = consts;
const RetryfyQueue = {
  interval: 25,
  intervalId: void 0,
  limit: consts_1$2.LIMIT_FILES_DESCRIPTORS,
  queueActive: /* @__PURE__ */ new Set(),
  queueWaiting: /* @__PURE__ */ new Set(),
  init: () => {
    if (RetryfyQueue.intervalId)
      return;
    RetryfyQueue.intervalId = setInterval(RetryfyQueue.tick, RetryfyQueue.interval);
  },
  reset: () => {
    if (!RetryfyQueue.intervalId)
      return;
    clearInterval(RetryfyQueue.intervalId);
    delete RetryfyQueue.intervalId;
  },
  add: (fn) => {
    RetryfyQueue.queueWaiting.add(fn);
    if (RetryfyQueue.queueActive.size < RetryfyQueue.limit / 2) {
      RetryfyQueue.tick();
    } else {
      RetryfyQueue.init();
    }
  },
  remove: (fn) => {
    RetryfyQueue.queueWaiting.delete(fn);
    RetryfyQueue.queueActive.delete(fn);
  },
  schedule: () => {
    return new Promise((resolve2) => {
      const cleanup = () => RetryfyQueue.remove(resolver);
      const resolver = () => resolve2(cleanup);
      RetryfyQueue.add(resolver);
    });
  },
  tick: () => {
    if (RetryfyQueue.queueActive.size >= RetryfyQueue.limit)
      return;
    if (!RetryfyQueue.queueWaiting.size)
      return RetryfyQueue.reset();
    for (const fn of RetryfyQueue.queueWaiting) {
      if (RetryfyQueue.queueActive.size >= RetryfyQueue.limit)
        break;
      RetryfyQueue.queueWaiting.delete(fn);
      RetryfyQueue.queueActive.add(fn);
      fn();
    }
  }
};
retryify_queue.default = RetryfyQueue;
Object.defineProperty(retryify, "__esModule", { value: true });
retryify.retryifySync = retryify.retryifyAsync = void 0;
const retryify_queue_1 = retryify_queue;
const retryifyAsync = (fn, isRetriableError) => {
  return function(timestamp) {
    return function attempt() {
      return retryify_queue_1.default.schedule().then((cleanup) => {
        return fn.apply(void 0, arguments).then((result) => {
          cleanup();
          return result;
        }, (error2) => {
          cleanup();
          if (Date.now() >= timestamp)
            throw error2;
          if (isRetriableError(error2)) {
            const delay = Math.round(100 + 400 * Math.random()), delayPromise = new Promise((resolve2) => setTimeout(resolve2, delay));
            return delayPromise.then(() => attempt.apply(void 0, arguments));
          }
          throw error2;
        });
      });
    };
  };
};
retryify.retryifyAsync = retryifyAsync;
const retryifySync = (fn, isRetriableError) => {
  return function(timestamp) {
    return function attempt() {
      try {
        return fn.apply(void 0, arguments);
      } catch (error2) {
        if (Date.now() > timestamp)
          throw error2;
        if (isRetriableError(error2))
          return attempt.apply(void 0, arguments);
        throw error2;
      }
    };
  };
};
retryify.retryifySync = retryifySync;
Object.defineProperty(fs$1, "__esModule", { value: true });
const fs = fs$4;
const util_1$d = require$$2;
const attemptify_1 = attemptify;
const fs_handlers_1 = fs_handlers;
const retryify_1 = retryify;
const FS = {
  chmodAttempt: attemptify_1.attemptifyAsync(util_1$d.promisify(fs.chmod), fs_handlers_1.default.onChangeError),
  chownAttempt: attemptify_1.attemptifyAsync(util_1$d.promisify(fs.chown), fs_handlers_1.default.onChangeError),
  closeAttempt: attemptify_1.attemptifyAsync(util_1$d.promisify(fs.close)),
  fsyncAttempt: attemptify_1.attemptifyAsync(util_1$d.promisify(fs.fsync)),
  mkdirAttempt: attemptify_1.attemptifyAsync(util_1$d.promisify(fs.mkdir)),
  realpathAttempt: attemptify_1.attemptifyAsync(util_1$d.promisify(fs.realpath)),
  statAttempt: attemptify_1.attemptifyAsync(util_1$d.promisify(fs.stat)),
  unlinkAttempt: attemptify_1.attemptifyAsync(util_1$d.promisify(fs.unlink)),
  closeRetry: retryify_1.retryifyAsync(util_1$d.promisify(fs.close), fs_handlers_1.default.isRetriableError),
  fsyncRetry: retryify_1.retryifyAsync(util_1$d.promisify(fs.fsync), fs_handlers_1.default.isRetriableError),
  openRetry: retryify_1.retryifyAsync(util_1$d.promisify(fs.open), fs_handlers_1.default.isRetriableError),
  readFileRetry: retryify_1.retryifyAsync(util_1$d.promisify(fs.readFile), fs_handlers_1.default.isRetriableError),
  renameRetry: retryify_1.retryifyAsync(util_1$d.promisify(fs.rename), fs_handlers_1.default.isRetriableError),
  statRetry: retryify_1.retryifyAsync(util_1$d.promisify(fs.stat), fs_handlers_1.default.isRetriableError),
  writeRetry: retryify_1.retryifyAsync(util_1$d.promisify(fs.write), fs_handlers_1.default.isRetriableError),
  chmodSyncAttempt: attemptify_1.attemptifySync(fs.chmodSync, fs_handlers_1.default.onChangeError),
  chownSyncAttempt: attemptify_1.attemptifySync(fs.chownSync, fs_handlers_1.default.onChangeError),
  closeSyncAttempt: attemptify_1.attemptifySync(fs.closeSync),
  mkdirSyncAttempt: attemptify_1.attemptifySync(fs.mkdirSync),
  realpathSyncAttempt: attemptify_1.attemptifySync(fs.realpathSync),
  statSyncAttempt: attemptify_1.attemptifySync(fs.statSync),
  unlinkSyncAttempt: attemptify_1.attemptifySync(fs.unlinkSync),
  closeSyncRetry: retryify_1.retryifySync(fs.closeSync, fs_handlers_1.default.isRetriableError),
  fsyncSyncRetry: retryify_1.retryifySync(fs.fsyncSync, fs_handlers_1.default.isRetriableError),
  openSyncRetry: retryify_1.retryifySync(fs.openSync, fs_handlers_1.default.isRetriableError),
  readFileSyncRetry: retryify_1.retryifySync(fs.readFileSync, fs_handlers_1.default.isRetriableError),
  renameSyncRetry: retryify_1.retryifySync(fs.renameSync, fs_handlers_1.default.isRetriableError),
  statSyncRetry: retryify_1.retryifySync(fs.statSync, fs_handlers_1.default.isRetriableError),
  writeSyncRetry: retryify_1.retryifySync(fs.writeSync, fs_handlers_1.default.isRetriableError)
};
fs$1.default = FS;
var lang = {};
Object.defineProperty(lang, "__esModule", { value: true });
const Lang = {
  isFunction: (x) => {
    return typeof x === "function";
  },
  isString: (x) => {
    return typeof x === "string";
  },
  isUndefined: (x) => {
    return typeof x === "undefined";
  }
};
lang.default = Lang;
var scheduler = {};
Object.defineProperty(scheduler, "__esModule", { value: true });
const Queues = {};
const Scheduler = {
  next: (id2) => {
    const queue = Queues[id2];
    if (!queue)
      return;
    queue.shift();
    const job = queue[0];
    if (job) {
      job(() => Scheduler.next(id2));
    } else {
      delete Queues[id2];
    }
  },
  schedule: (id2) => {
    return new Promise((resolve2) => {
      let queue = Queues[id2];
      if (!queue)
        queue = Queues[id2] = [];
      queue.push(resolve2);
      if (queue.length > 1)
        return;
      resolve2(() => Scheduler.next(id2));
    });
  }
};
scheduler.default = Scheduler;
var temp = {};
Object.defineProperty(temp, "__esModule", { value: true });
const path$2 = path$7;
const consts_1$1 = consts;
const fs_1$1 = fs$1;
const Temp = {
  store: {},
  create: (filePath) => {
    const randomness = `000000${Math.floor(Math.random() * 16777215).toString(16)}`.slice(-6), timestamp = Date.now().toString().slice(-10), prefix = "tmp-", suffix = `.${prefix}${timestamp}${randomness}`, tempPath = `${filePath}${suffix}`;
    return tempPath;
  },
  get: (filePath, creator, purge = true) => {
    const tempPath = Temp.truncate(creator(filePath));
    if (tempPath in Temp.store)
      return Temp.get(filePath, creator, purge);
    Temp.store[tempPath] = purge;
    const disposer = () => delete Temp.store[tempPath];
    return [tempPath, disposer];
  },
  purge: (filePath) => {
    if (!Temp.store[filePath])
      return;
    delete Temp.store[filePath];
    fs_1$1.default.unlinkAttempt(filePath);
  },
  purgeSync: (filePath) => {
    if (!Temp.store[filePath])
      return;
    delete Temp.store[filePath];
    fs_1$1.default.unlinkSyncAttempt(filePath);
  },
  purgeSyncAll: () => {
    for (const filePath in Temp.store) {
      Temp.purgeSync(filePath);
    }
  },
  truncate: (filePath) => {
    const basename = path$2.basename(filePath);
    if (basename.length <= consts_1$1.LIMIT_BASENAME_LENGTH)
      return filePath;
    const truncable = /^(\.?)(.*?)((?:\.[^.]+)?(?:\.tmp-\d{10}[a-f0-9]{6})?)$/.exec(basename);
    if (!truncable)
      return filePath;
    const truncationLength = basename.length - consts_1$1.LIMIT_BASENAME_LENGTH;
    return `${filePath.slice(0, -basename.length)}${truncable[1]}${truncable[2].slice(0, -truncationLength)}${truncable[3]}`;
  }
};
process.on("exit", Temp.purgeSyncAll);
temp.default = Temp;
Object.defineProperty(dist$1, "__esModule", { value: true });
dist$1.writeFileSync = dist$1.writeFile = dist$1.readFileSync = dist$1.readFile = void 0;
const path$1 = path$7;
const consts_1 = consts;
const fs_1 = fs$1;
const lang_1 = lang;
const scheduler_1 = scheduler;
const temp_1 = temp;
function readFile(filePath, options = consts_1.DEFAULT_READ_OPTIONS) {
  var _a;
  if (lang_1.default.isString(options))
    return readFile(filePath, { encoding: options });
  const timeout = Date.now() + ((_a = options.timeout) !== null && _a !== void 0 ? _a : consts_1.DEFAULT_TIMEOUT_ASYNC);
  return fs_1.default.readFileRetry(timeout)(filePath, options);
}
dist$1.readFile = readFile;
function readFileSync(filePath, options = consts_1.DEFAULT_READ_OPTIONS) {
  var _a;
  if (lang_1.default.isString(options))
    return readFileSync(filePath, { encoding: options });
  const timeout = Date.now() + ((_a = options.timeout) !== null && _a !== void 0 ? _a : consts_1.DEFAULT_TIMEOUT_SYNC);
  return fs_1.default.readFileSyncRetry(timeout)(filePath, options);
}
dist$1.readFileSync = readFileSync;
const writeFile = (filePath, data, options, callback) => {
  if (lang_1.default.isFunction(options))
    return writeFile(filePath, data, consts_1.DEFAULT_WRITE_OPTIONS, options);
  const promise = writeFileAsync(filePath, data, options);
  if (callback)
    promise.then(callback, callback);
  return promise;
};
dist$1.writeFile = writeFile;
const writeFileAsync = async (filePath, data, options = consts_1.DEFAULT_WRITE_OPTIONS) => {
  var _a;
  if (lang_1.default.isString(options))
    return writeFileAsync(filePath, data, { encoding: options });
  const timeout = Date.now() + ((_a = options.timeout) !== null && _a !== void 0 ? _a : consts_1.DEFAULT_TIMEOUT_ASYNC);
  let schedulerCustomDisposer = null, schedulerDisposer = null, tempDisposer = null, tempPath = null, fd = null;
  try {
    if (options.schedule)
      schedulerCustomDisposer = await options.schedule(filePath);
    schedulerDisposer = await scheduler_1.default.schedule(filePath);
    filePath = await fs_1.default.realpathAttempt(filePath) || filePath;
    [tempPath, tempDisposer] = temp_1.default.get(filePath, options.tmpCreate || temp_1.default.create, !(options.tmpPurge === false));
    const useStatChown = consts_1.IS_POSIX && lang_1.default.isUndefined(options.chown), useStatMode = lang_1.default.isUndefined(options.mode);
    if (useStatChown || useStatMode) {
      const stat = await fs_1.default.statAttempt(filePath);
      if (stat) {
        options = { ...options };
        if (useStatChown)
          options.chown = { uid: stat.uid, gid: stat.gid };
        if (useStatMode)
          options.mode = stat.mode;
      }
    }
    const parentPath = path$1.dirname(filePath);
    await fs_1.default.mkdirAttempt(parentPath, {
      mode: consts_1.DEFAULT_FOLDER_MODE,
      recursive: true
    });
    fd = await fs_1.default.openRetry(timeout)(tempPath, "w", options.mode || consts_1.DEFAULT_FILE_MODE);
    if (options.tmpCreated)
      options.tmpCreated(tempPath);
    if (lang_1.default.isString(data)) {
      await fs_1.default.writeRetry(timeout)(fd, data, 0, options.encoding || consts_1.DEFAULT_ENCODING);
    } else if (!lang_1.default.isUndefined(data)) {
      await fs_1.default.writeRetry(timeout)(fd, data, 0, data.length, 0);
    }
    if (options.fsync !== false) {
      if (options.fsyncWait !== false) {
        await fs_1.default.fsyncRetry(timeout)(fd);
      } else {
        fs_1.default.fsyncAttempt(fd);
      }
    }
    await fs_1.default.closeRetry(timeout)(fd);
    fd = null;
    if (options.chown)
      await fs_1.default.chownAttempt(tempPath, options.chown.uid, options.chown.gid);
    if (options.mode)
      await fs_1.default.chmodAttempt(tempPath, options.mode);
    try {
      await fs_1.default.renameRetry(timeout)(tempPath, filePath);
    } catch (error2) {
      if (error2.code !== "ENAMETOOLONG")
        throw error2;
      await fs_1.default.renameRetry(timeout)(tempPath, temp_1.default.truncate(filePath));
    }
    tempDisposer();
    tempPath = null;
  } finally {
    if (fd)
      await fs_1.default.closeAttempt(fd);
    if (tempPath)
      temp_1.default.purge(tempPath);
    if (schedulerCustomDisposer)
      schedulerCustomDisposer();
    if (schedulerDisposer)
      schedulerDisposer();
  }
};
const writeFileSync = (filePath, data, options = consts_1.DEFAULT_WRITE_OPTIONS) => {
  var _a;
  if (lang_1.default.isString(options))
    return writeFileSync(filePath, data, { encoding: options });
  const timeout = Date.now() + ((_a = options.timeout) !== null && _a !== void 0 ? _a : consts_1.DEFAULT_TIMEOUT_SYNC);
  let tempDisposer = null, tempPath = null, fd = null;
  try {
    filePath = fs_1.default.realpathSyncAttempt(filePath) || filePath;
    [tempPath, tempDisposer] = temp_1.default.get(filePath, options.tmpCreate || temp_1.default.create, !(options.tmpPurge === false));
    const useStatChown = consts_1.IS_POSIX && lang_1.default.isUndefined(options.chown), useStatMode = lang_1.default.isUndefined(options.mode);
    if (useStatChown || useStatMode) {
      const stat = fs_1.default.statSyncAttempt(filePath);
      if (stat) {
        options = { ...options };
        if (useStatChown)
          options.chown = { uid: stat.uid, gid: stat.gid };
        if (useStatMode)
          options.mode = stat.mode;
      }
    }
    const parentPath = path$1.dirname(filePath);
    fs_1.default.mkdirSyncAttempt(parentPath, {
      mode: consts_1.DEFAULT_FOLDER_MODE,
      recursive: true
    });
    fd = fs_1.default.openSyncRetry(timeout)(tempPath, "w", options.mode || consts_1.DEFAULT_FILE_MODE);
    if (options.tmpCreated)
      options.tmpCreated(tempPath);
    if (lang_1.default.isString(data)) {
      fs_1.default.writeSyncRetry(timeout)(fd, data, 0, options.encoding || consts_1.DEFAULT_ENCODING);
    } else if (!lang_1.default.isUndefined(data)) {
      fs_1.default.writeSyncRetry(timeout)(fd, data, 0, data.length, 0);
    }
    if (options.fsync !== false) {
      if (options.fsyncWait !== false) {
        fs_1.default.fsyncSyncRetry(timeout)(fd);
      } else {
        fs_1.default.fsyncAttempt(fd);
      }
    }
    fs_1.default.closeSyncRetry(timeout)(fd);
    fd = null;
    if (options.chown)
      fs_1.default.chownSyncAttempt(tempPath, options.chown.uid, options.chown.gid);
    if (options.mode)
      fs_1.default.chmodSyncAttempt(tempPath, options.mode);
    try {
      fs_1.default.renameSyncRetry(timeout)(tempPath, filePath);
    } catch (error2) {
      if (error2.code !== "ENAMETOOLONG")
        throw error2;
      fs_1.default.renameSyncRetry(timeout)(tempPath, temp_1.default.truncate(filePath));
    }
    tempDisposer();
    tempPath = null;
  } finally {
    if (fd)
      fs_1.default.closeSyncAttempt(fd);
    if (tempPath)
      temp_1.default.purge(tempPath);
  }
};
dist$1.writeFileSync = writeFileSync;
var ajv = {};
var context = {};
var dataType = {};
var rules = {};
Object.defineProperty(rules, "__esModule", { value: true });
rules.getRules = rules.isJSONType = void 0;
const _jsonTypes = ["string", "number", "integer", "boolean", "null", "object", "array"];
const jsonTypes = new Set(_jsonTypes);
function isJSONType(x) {
  return typeof x == "string" && jsonTypes.has(x);
}
rules.isJSONType = isJSONType;
function getRules() {
  const groups = {
    number: { type: "number", rules: [] },
    string: { type: "string", rules: [] },
    array: { type: "array", rules: [] },
    object: { type: "object", rules: [] }
  };
  return {
    types: { ...groups, integer: true, boolean: true, null: true },
    rules: [{ rules: [] }, groups.number, groups.string, groups.array, groups.object],
    post: { rules: [] },
    all: {},
    keywords: {}
  };
}
rules.getRules = getRules;
var applicability = {};
Object.defineProperty(applicability, "__esModule", { value: true });
applicability.shouldUseRule = applicability.shouldUseGroup = applicability.schemaHasRulesForType = void 0;
function schemaHasRulesForType({ schema, self: self2 }, type2) {
  const group = self2.RULES.types[type2];
  return group && group !== true && shouldUseGroup(schema, group);
}
applicability.schemaHasRulesForType = schemaHasRulesForType;
function shouldUseGroup(schema, group) {
  return group.rules.some((rule) => shouldUseRule(schema, rule));
}
applicability.shouldUseGroup = shouldUseGroup;
function shouldUseRule(schema, rule) {
  var _a;
  return schema[rule.keyword] !== void 0 || ((_a = rule.definition.implements) === null || _a === void 0 ? void 0 : _a.some((kwd) => schema[kwd] !== void 0));
}
applicability.shouldUseRule = shouldUseRule;
var errors$1 = {};
var codegen = {};
var code$1 = {};
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.getProperty = exports.safeStringify = exports.stringify = exports.strConcat = exports.addCodeArg = exports.str = exports._ = exports.nil = exports._Code = exports.Name = exports.IDENTIFIER = exports._CodeOrName = void 0;
  class _CodeOrName {
  }
  exports._CodeOrName = _CodeOrName;
  exports.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
  class Name extends _CodeOrName {
    constructor(s) {
      super();
      if (!exports.IDENTIFIER.test(s))
        throw new Error("CodeGen: name must be a valid identifier");
      this.str = s;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      return false;
    }
    get names() {
      return { [this.str]: 1 };
    }
  }
  exports.Name = Name;
  class _Code extends _CodeOrName {
    constructor(code2) {
      super();
      this._items = typeof code2 === "string" ? [code2] : code2;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      if (this._items.length > 1)
        return false;
      const item = this._items[0];
      return item === "" || item === '""';
    }
    get str() {
      var _a;
      return (_a = this._str) !== null && _a !== void 0 ? _a : this._str = this._items.reduce((s, c) => `${s}${c}`, "");
    }
    get names() {
      var _a;
      return (_a = this._names) !== null && _a !== void 0 ? _a : this._names = this._items.reduce((names2, c) => {
        if (c instanceof Name)
          names2[c.str] = (names2[c.str] || 0) + 1;
        return names2;
      }, {});
    }
  }
  exports._Code = _Code;
  exports.nil = new _Code("");
  function _(strs, ...args) {
    const code2 = [strs[0]];
    let i = 0;
    while (i < args.length) {
      addCodeArg(code2, args[i]);
      code2.push(strs[++i]);
    }
    return new _Code(code2);
  }
  exports._ = _;
  const plus = new _Code("+");
  function str(strs, ...args) {
    const expr = [safeStringify(strs[0])];
    let i = 0;
    while (i < args.length) {
      expr.push(plus);
      addCodeArg(expr, args[i]);
      expr.push(plus, safeStringify(strs[++i]));
    }
    optimize(expr);
    return new _Code(expr);
  }
  exports.str = str;
  function addCodeArg(code2, arg) {
    if (arg instanceof _Code)
      code2.push(...arg._items);
    else if (arg instanceof Name)
      code2.push(arg);
    else
      code2.push(interpolate(arg));
  }
  exports.addCodeArg = addCodeArg;
  function optimize(expr) {
    let i = 1;
    while (i < expr.length - 1) {
      if (expr[i] === plus) {
        const res = mergeExprItems(expr[i - 1], expr[i + 1]);
        if (res !== void 0) {
          expr.splice(i - 1, 3, res);
          continue;
        }
        expr[i++] = "+";
      }
      i++;
    }
  }
  function mergeExprItems(a, b) {
    if (b === '""')
      return a;
    if (a === '""')
      return b;
    if (typeof a == "string") {
      if (b instanceof Name || a[a.length - 1] !== '"')
        return;
      if (typeof b != "string")
        return `${a.slice(0, -1)}${b}"`;
      if (b[0] === '"')
        return a.slice(0, -1) + b.slice(1);
      return;
    }
    if (typeof b == "string" && b[0] === '"' && !(a instanceof Name))
      return `"${a}${b.slice(1)}`;
    return;
  }
  function strConcat(c1, c2) {
    return c2.emptyStr() ? c1 : c1.emptyStr() ? c2 : str`${c1}${c2}`;
  }
  exports.strConcat = strConcat;
  function interpolate(x) {
    return typeof x == "number" || typeof x == "boolean" || x === null ? x : safeStringify(Array.isArray(x) ? x.join(",") : x);
  }
  function stringify(x) {
    return new _Code(safeStringify(x));
  }
  exports.stringify = stringify;
  function safeStringify(x) {
    return JSON.stringify(x).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  }
  exports.safeStringify = safeStringify;
  function getProperty(key) {
    return typeof key == "string" && exports.IDENTIFIER.test(key) ? new _Code(`.${key}`) : _`[${key}]`;
  }
  exports.getProperty = getProperty;
})(code$1);
var scope = {};
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.ValueScope = exports.ValueScopeName = exports.Scope = exports.varKinds = exports.UsedValueState = void 0;
  const code_12 = code$1;
  class ValueError extends Error {
    constructor(name) {
      super(`CodeGen: "code" for ${name} not defined`);
      this.value = name.value;
    }
  }
  var UsedValueState;
  (function(UsedValueState2) {
    UsedValueState2[UsedValueState2["Started"] = 0] = "Started";
    UsedValueState2[UsedValueState2["Completed"] = 1] = "Completed";
  })(UsedValueState = exports.UsedValueState || (exports.UsedValueState = {}));
  exports.varKinds = {
    const: new code_12.Name("const"),
    let: new code_12.Name("let"),
    var: new code_12.Name("var")
  };
  class Scope {
    constructor({ prefixes, parent } = {}) {
      this._names = {};
      this._prefixes = prefixes;
      this._parent = parent;
    }
    toName(nameOrPrefix) {
      return nameOrPrefix instanceof code_12.Name ? nameOrPrefix : this.name(nameOrPrefix);
    }
    name(prefix) {
      return new code_12.Name(this._newName(prefix));
    }
    _newName(prefix) {
      const ng = this._names[prefix] || this._nameGroup(prefix);
      return `${prefix}${ng.index++}`;
    }
    _nameGroup(prefix) {
      var _a, _b;
      if (((_b = (_a = this._parent) === null || _a === void 0 ? void 0 : _a._prefixes) === null || _b === void 0 ? void 0 : _b.has(prefix)) || this._prefixes && !this._prefixes.has(prefix)) {
        throw new Error(`CodeGen: prefix "${prefix}" is not allowed in this scope`);
      }
      return this._names[prefix] = { prefix, index: 0 };
    }
  }
  exports.Scope = Scope;
  class ValueScopeName extends code_12.Name {
    constructor(prefix, nameStr) {
      super(nameStr);
      this.prefix = prefix;
    }
    setValue(value, { property, itemIndex }) {
      this.value = value;
      this.scopePath = code_12._`.${new code_12.Name(property)}[${itemIndex}]`;
    }
  }
  exports.ValueScopeName = ValueScopeName;
  const line = code_12._`\n`;
  class ValueScope extends Scope {
    constructor(opts) {
      super(opts);
      this._values = {};
      this._scope = opts.scope;
      this.opts = { ...opts, _n: opts.lines ? line : code_12.nil };
    }
    get() {
      return this._scope;
    }
    name(prefix) {
      return new ValueScopeName(prefix, this._newName(prefix));
    }
    value(nameOrPrefix, value) {
      var _a;
      if (value.ref === void 0)
        throw new Error("CodeGen: ref must be passed in value");
      const name = this.toName(nameOrPrefix);
      const { prefix } = name;
      const valueKey = (_a = value.key) !== null && _a !== void 0 ? _a : value.ref;
      let vs = this._values[prefix];
      if (vs) {
        const _name = vs.get(valueKey);
        if (_name)
          return _name;
      } else {
        vs = this._values[prefix] = /* @__PURE__ */ new Map();
      }
      vs.set(valueKey, name);
      const s = this._scope[prefix] || (this._scope[prefix] = []);
      const itemIndex = s.length;
      s[itemIndex] = value.ref;
      name.setValue(value, { property: prefix, itemIndex });
      return name;
    }
    getValue(prefix, keyOrRef) {
      const vs = this._values[prefix];
      if (!vs)
        return;
      return vs.get(keyOrRef);
    }
    scopeRefs(scopeName, values = this._values) {
      return this._reduceValues(values, (name) => {
        if (name.scopePath === void 0)
          throw new Error(`CodeGen: name "${name}" has no value`);
        return code_12._`${scopeName}${name.scopePath}`;
      });
    }
    scopeCode(values = this._values, usedValues, getCode) {
      return this._reduceValues(values, (name) => {
        if (name.value === void 0)
          throw new Error(`CodeGen: name "${name}" has no value`);
        return name.value.code;
      }, usedValues, getCode);
    }
    _reduceValues(values, valueCode, usedValues = {}, getCode) {
      let code2 = code_12.nil;
      for (const prefix in values) {
        const vs = values[prefix];
        if (!vs)
          continue;
        const nameSet = usedValues[prefix] = usedValues[prefix] || /* @__PURE__ */ new Map();
        vs.forEach((name) => {
          if (nameSet.has(name))
            return;
          nameSet.set(name, UsedValueState.Started);
          let c = valueCode(name);
          if (c) {
            const def2 = this.opts.es5 ? exports.varKinds.var : exports.varKinds.const;
            code2 = code_12._`${code2}${def2} ${name} = ${c};${this.opts._n}`;
          } else if (c = getCode === null || getCode === void 0 ? void 0 : getCode(name)) {
            code2 = code_12._`${code2}${c}${this.opts._n}`;
          } else {
            throw new ValueError(name);
          }
          nameSet.set(name, UsedValueState.Completed);
        });
      }
      return code2;
    }
  }
  exports.ValueScope = ValueScope;
})(scope);
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.or = exports.and = exports.not = exports.CodeGen = exports.operators = exports.varKinds = exports.ValueScopeName = exports.ValueScope = exports.Scope = exports.Name = exports.stringify = exports.getProperty = exports.nil = exports.strConcat = exports.str = exports._ = void 0;
  const code_12 = code$1;
  const scope_1 = scope;
  var code_2 = code$1;
  Object.defineProperty(exports, "_", { enumerable: true, get: function() {
    return code_2._;
  } });
  Object.defineProperty(exports, "str", { enumerable: true, get: function() {
    return code_2.str;
  } });
  Object.defineProperty(exports, "strConcat", { enumerable: true, get: function() {
    return code_2.strConcat;
  } });
  Object.defineProperty(exports, "nil", { enumerable: true, get: function() {
    return code_2.nil;
  } });
  Object.defineProperty(exports, "getProperty", { enumerable: true, get: function() {
    return code_2.getProperty;
  } });
  Object.defineProperty(exports, "stringify", { enumerable: true, get: function() {
    return code_2.stringify;
  } });
  Object.defineProperty(exports, "Name", { enumerable: true, get: function() {
    return code_2.Name;
  } });
  var scope_2 = scope;
  Object.defineProperty(exports, "Scope", { enumerable: true, get: function() {
    return scope_2.Scope;
  } });
  Object.defineProperty(exports, "ValueScope", { enumerable: true, get: function() {
    return scope_2.ValueScope;
  } });
  Object.defineProperty(exports, "ValueScopeName", { enumerable: true, get: function() {
    return scope_2.ValueScopeName;
  } });
  Object.defineProperty(exports, "varKinds", { enumerable: true, get: function() {
    return scope_2.varKinds;
  } });
  exports.operators = {
    GT: new code_12._Code(">"),
    GTE: new code_12._Code(">="),
    LT: new code_12._Code("<"),
    LTE: new code_12._Code("<="),
    EQ: new code_12._Code("==="),
    NEQ: new code_12._Code("!=="),
    NOT: new code_12._Code("!"),
    OR: new code_12._Code("||"),
    AND: new code_12._Code("&&"),
    ADD: new code_12._Code("+")
  };
  class Node {
    optimizeNodes() {
      return this;
    }
    optimizeNames(_names, _constants) {
      return this;
    }
  }
  class Def extends Node {
    constructor(varKind, name, rhs) {
      super();
      this.varKind = varKind;
      this.name = name;
      this.rhs = rhs;
    }
    render({ es5, _n }) {
      const varKind = es5 ? scope_1.varKinds.var : this.varKind;
      const rhs = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
      return `${varKind} ${this.name}${rhs};` + _n;
    }
    optimizeNames(names2, constants2) {
      if (!names2[this.name.str])
        return;
      if (this.rhs)
        this.rhs = optimizeExpr(this.rhs, names2, constants2);
      return this;
    }
    get names() {
      return this.rhs instanceof code_12._CodeOrName ? this.rhs.names : {};
    }
  }
  class Assign extends Node {
    constructor(lhs, rhs, sideEffects) {
      super();
      this.lhs = lhs;
      this.rhs = rhs;
      this.sideEffects = sideEffects;
    }
    render({ _n }) {
      return `${this.lhs} = ${this.rhs};` + _n;
    }
    optimizeNames(names2, constants2) {
      if (this.lhs instanceof code_12.Name && !names2[this.lhs.str] && !this.sideEffects)
        return;
      this.rhs = optimizeExpr(this.rhs, names2, constants2);
      return this;
    }
    get names() {
      const names2 = this.lhs instanceof code_12.Name ? {} : { ...this.lhs.names };
      return addExprNames(names2, this.rhs);
    }
  }
  class AssignOp extends Assign {
    constructor(lhs, op, rhs, sideEffects) {
      super(lhs, rhs, sideEffects);
      this.op = op;
    }
    render({ _n }) {
      return `${this.lhs} ${this.op}= ${this.rhs};` + _n;
    }
  }
  class Label extends Node {
    constructor(label) {
      super();
      this.label = label;
      this.names = {};
    }
    render({ _n }) {
      return `${this.label}:` + _n;
    }
  }
  class Break extends Node {
    constructor(label) {
      super();
      this.label = label;
      this.names = {};
    }
    render({ _n }) {
      const label = this.label ? ` ${this.label}` : "";
      return `break${label};` + _n;
    }
  }
  class Throw extends Node {
    constructor(error2) {
      super();
      this.error = error2;
    }
    render({ _n }) {
      return `throw ${this.error};` + _n;
    }
    get names() {
      return this.error.names;
    }
  }
  class AnyCode extends Node {
    constructor(code2) {
      super();
      this.code = code2;
    }
    render({ _n }) {
      return `${this.code};` + _n;
    }
    optimizeNodes() {
      return `${this.code}` ? this : void 0;
    }
    optimizeNames(names2, constants2) {
      this.code = optimizeExpr(this.code, names2, constants2);
      return this;
    }
    get names() {
      return this.code instanceof code_12._CodeOrName ? this.code.names : {};
    }
  }
  class ParentNode extends Node {
    constructor(nodes = []) {
      super();
      this.nodes = nodes;
    }
    render(opts) {
      return this.nodes.reduce((code2, n) => code2 + n.render(opts), "");
    }
    optimizeNodes() {
      const { nodes } = this;
      let i = nodes.length;
      while (i--) {
        const n = nodes[i].optimizeNodes();
        if (Array.isArray(n))
          nodes.splice(i, 1, ...n);
        else if (n)
          nodes[i] = n;
        else
          nodes.splice(i, 1);
      }
      return nodes.length > 0 ? this : void 0;
    }
    optimizeNames(names2, constants2) {
      const { nodes } = this;
      let i = nodes.length;
      while (i--) {
        const n = nodes[i];
        if (n.optimizeNames(names2, constants2))
          continue;
        subtractNames(names2, n.names);
        nodes.splice(i, 1);
      }
      return nodes.length > 0 ? this : void 0;
    }
    get names() {
      return this.nodes.reduce((names2, n) => addNames(names2, n.names), {});
    }
  }
  class BlockNode extends ParentNode {
    render(opts) {
      return "{" + opts._n + super.render(opts) + "}" + opts._n;
    }
  }
  class Root extends ParentNode {
  }
  class Else extends BlockNode {
  }
  Else.kind = "else";
  class If extends BlockNode {
    constructor(condition, nodes) {
      super(nodes);
      this.condition = condition;
    }
    render(opts) {
      let code2 = `if(${this.condition})` + super.render(opts);
      if (this.else)
        code2 += "else " + this.else.render(opts);
      return code2;
    }
    optimizeNodes() {
      super.optimizeNodes();
      const cond = this.condition;
      if (cond === true)
        return this.nodes;
      let e = this.else;
      if (e) {
        const ns = e.optimizeNodes();
        e = this.else = Array.isArray(ns) ? new Else(ns) : ns;
      }
      if (e) {
        if (cond === false)
          return e instanceof If ? e : e.nodes;
        if (this.nodes.length)
          return this;
        return new If(not2(cond), e instanceof If ? [e] : e.nodes);
      }
      if (cond === false || !this.nodes.length)
        return void 0;
      return this;
    }
    optimizeNames(names2, constants2) {
      var _a;
      this.else = (_a = this.else) === null || _a === void 0 ? void 0 : _a.optimizeNames(names2, constants2);
      if (!(super.optimizeNames(names2, constants2) || this.else))
        return;
      this.condition = optimizeExpr(this.condition, names2, constants2);
      return this;
    }
    get names() {
      const names2 = super.names;
      addExprNames(names2, this.condition);
      if (this.else)
        addNames(names2, this.else.names);
      return names2;
    }
  }
  If.kind = "if";
  class For extends BlockNode {
  }
  For.kind = "for";
  class ForLoop extends For {
    constructor(iteration) {
      super();
      this.iteration = iteration;
    }
    render(opts) {
      return `for(${this.iteration})` + super.render(opts);
    }
    optimizeNames(names2, constants2) {
      if (!super.optimizeNames(names2, constants2))
        return;
      this.iteration = optimizeExpr(this.iteration, names2, constants2);
      return this;
    }
    get names() {
      return addNames(super.names, this.iteration.names);
    }
  }
  class ForRange extends For {
    constructor(varKind, name, from, to) {
      super();
      this.varKind = varKind;
      this.name = name;
      this.from = from;
      this.to = to;
    }
    render(opts) {
      const varKind = opts.es5 ? scope_1.varKinds.var : this.varKind;
      const { name, from, to } = this;
      return `for(${varKind} ${name}=${from}; ${name}<${to}; ${name}++)` + super.render(opts);
    }
    get names() {
      const names2 = addExprNames(super.names, this.from);
      return addExprNames(names2, this.to);
    }
  }
  class ForIter extends For {
    constructor(loop, varKind, name, iterable) {
      super();
      this.loop = loop;
      this.varKind = varKind;
      this.name = name;
      this.iterable = iterable;
    }
    render(opts) {
      return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(opts);
    }
    optimizeNames(names2, constants2) {
      if (!super.optimizeNames(names2, constants2))
        return;
      this.iterable = optimizeExpr(this.iterable, names2, constants2);
      return this;
    }
    get names() {
      return addNames(super.names, this.iterable.names);
    }
  }
  class Func extends BlockNode {
    constructor(name, args, async) {
      super();
      this.name = name;
      this.args = args;
      this.async = async;
    }
    render(opts) {
      const _async = this.async ? "async " : "";
      return `${_async}function ${this.name}(${this.args})` + super.render(opts);
    }
  }
  Func.kind = "func";
  class Return extends ParentNode {
    render(opts) {
      return "return " + super.render(opts);
    }
  }
  Return.kind = "return";
  class Try extends BlockNode {
    render(opts) {
      let code2 = "try" + super.render(opts);
      if (this.catch)
        code2 += this.catch.render(opts);
      if (this.finally)
        code2 += this.finally.render(opts);
      return code2;
    }
    optimizeNodes() {
      var _a, _b;
      super.optimizeNodes();
      (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNodes();
      (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNodes();
      return this;
    }
    optimizeNames(names2, constants2) {
      var _a, _b;
      super.optimizeNames(names2, constants2);
      (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNames(names2, constants2);
      (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNames(names2, constants2);
      return this;
    }
    get names() {
      const names2 = super.names;
      if (this.catch)
        addNames(names2, this.catch.names);
      if (this.finally)
        addNames(names2, this.finally.names);
      return names2;
    }
  }
  class Catch extends BlockNode {
    constructor(error2) {
      super();
      this.error = error2;
    }
    render(opts) {
      return `catch(${this.error})` + super.render(opts);
    }
  }
  Catch.kind = "catch";
  class Finally extends BlockNode {
    render(opts) {
      return "finally" + super.render(opts);
    }
  }
  Finally.kind = "finally";
  class CodeGen {
    constructor(extScope, opts = {}) {
      this._values = {};
      this._blockStarts = [];
      this._constants = {};
      this.opts = { ...opts, _n: opts.lines ? "\n" : "" };
      this._extScope = extScope;
      this._scope = new scope_1.Scope({ parent: extScope });
      this._nodes = [new Root()];
    }
    toString() {
      return this._root.render(this.opts);
    }
    // returns unique name in the internal scope
    name(prefix) {
      return this._scope.name(prefix);
    }
    // reserves unique name in the external scope
    scopeName(prefix) {
      return this._extScope.name(prefix);
    }
    // reserves unique name in the external scope and assigns value to it
    scopeValue(prefixOrName, value) {
      const name = this._extScope.value(prefixOrName, value);
      const vs = this._values[name.prefix] || (this._values[name.prefix] = /* @__PURE__ */ new Set());
      vs.add(name);
      return name;
    }
    getScopeValue(prefix, keyOrRef) {
      return this._extScope.getValue(prefix, keyOrRef);
    }
    // return code that assigns values in the external scope to the names that are used internally
    // (same names that were returned by gen.scopeName or gen.scopeValue)
    scopeRefs(scopeName) {
      return this._extScope.scopeRefs(scopeName, this._values);
    }
    scopeCode() {
      return this._extScope.scopeCode(this._values);
    }
    _def(varKind, nameOrPrefix, rhs, constant) {
      const name = this._scope.toName(nameOrPrefix);
      if (rhs !== void 0 && constant)
        this._constants[name.str] = rhs;
      this._leafNode(new Def(varKind, name, rhs));
      return name;
    }
    // `const` declaration (`var` in es5 mode)
    const(nameOrPrefix, rhs, _constant) {
      return this._def(scope_1.varKinds.const, nameOrPrefix, rhs, _constant);
    }
    // `let` declaration with optional assignment (`var` in es5 mode)
    let(nameOrPrefix, rhs, _constant) {
      return this._def(scope_1.varKinds.let, nameOrPrefix, rhs, _constant);
    }
    // `var` declaration with optional assignment
    var(nameOrPrefix, rhs, _constant) {
      return this._def(scope_1.varKinds.var, nameOrPrefix, rhs, _constant);
    }
    // assignment code
    assign(lhs, rhs, sideEffects) {
      return this._leafNode(new Assign(lhs, rhs, sideEffects));
    }
    // `+=` code
    add(lhs, rhs) {
      return this._leafNode(new AssignOp(lhs, exports.operators.ADD, rhs));
    }
    // appends passed SafeExpr to code or executes Block
    code(c) {
      if (typeof c == "function")
        c();
      else if (c !== code_12.nil)
        this._leafNode(new AnyCode(c));
      return this;
    }
    // returns code for object literal for the passed argument list of key-value pairs
    object(...keyValues) {
      const code2 = ["{"];
      for (const [key, value] of keyValues) {
        if (code2.length > 1)
          code2.push(",");
        code2.push(key);
        if (key !== value || this.opts.es5) {
          code2.push(":");
          code_12.addCodeArg(code2, value);
        }
      }
      code2.push("}");
      return new code_12._Code(code2);
    }
    // `if` clause (or statement if `thenBody` and, optionally, `elseBody` are passed)
    if(condition, thenBody, elseBody) {
      this._blockNode(new If(condition));
      if (thenBody && elseBody) {
        this.code(thenBody).else().code(elseBody).endIf();
      } else if (thenBody) {
        this.code(thenBody).endIf();
      } else if (elseBody) {
        throw new Error('CodeGen: "else" body without "then" body');
      }
      return this;
    }
    // `else if` clause - invalid without `if` or after `else` clauses
    elseIf(condition) {
      return this._elseNode(new If(condition));
    }
    // `else` clause - only valid after `if` or `else if` clauses
    else() {
      return this._elseNode(new Else());
    }
    // end `if` statement (needed if gen.if was used only with condition)
    endIf() {
      return this._endBlockNode(If, Else);
    }
    _for(node, forBody) {
      this._blockNode(node);
      if (forBody)
        this.code(forBody).endFor();
      return this;
    }
    // a generic `for` clause (or statement if `forBody` is passed)
    for(iteration, forBody) {
      return this._for(new ForLoop(iteration), forBody);
    }
    // `for` statement for a range of values
    forRange(nameOrPrefix, from, to, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.let) {
      const name = this._scope.toName(nameOrPrefix);
      return this._for(new ForRange(varKind, name, from, to), () => forBody(name));
    }
    // `for-of` statement (in es5 mode replace with a normal for loop)
    forOf(nameOrPrefix, iterable, forBody, varKind = scope_1.varKinds.const) {
      const name = this._scope.toName(nameOrPrefix);
      if (this.opts.es5) {
        const arr = iterable instanceof code_12.Name ? iterable : this.var("_arr", iterable);
        return this.forRange("_i", 0, code_12._`${arr}.length`, (i) => {
          this.var(name, code_12._`${arr}[${i}]`);
          forBody(name);
        });
      }
      return this._for(new ForIter("of", varKind, name, iterable), () => forBody(name));
    }
    // `for-in` statement.
    // With option `ownProperties` replaced with a `for-of` loop for object keys
    forIn(nameOrPrefix, obj, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.const) {
      if (this.opts.ownProperties) {
        return this.forOf(nameOrPrefix, code_12._`Object.keys(${obj})`, forBody);
      }
      const name = this._scope.toName(nameOrPrefix);
      return this._for(new ForIter("in", varKind, name, obj), () => forBody(name));
    }
    // end `for` loop
    endFor() {
      return this._endBlockNode(For);
    }
    // `label` statement
    label(label) {
      return this._leafNode(new Label(label));
    }
    // `break` statement
    break(label) {
      return this._leafNode(new Break(label));
    }
    // `return` statement
    return(value) {
      const node = new Return();
      this._blockNode(node);
      this.code(value);
      if (node.nodes.length !== 1)
        throw new Error('CodeGen: "return" should have one node');
      return this._endBlockNode(Return);
    }
    // `try` statement
    try(tryBody, catchCode, finallyCode) {
      if (!catchCode && !finallyCode)
        throw new Error('CodeGen: "try" without "catch" and "finally"');
      const node = new Try();
      this._blockNode(node);
      this.code(tryBody);
      if (catchCode) {
        const error2 = this.name("e");
        this._currNode = node.catch = new Catch(error2);
        catchCode(error2);
      }
      if (finallyCode) {
        this._currNode = node.finally = new Finally();
        this.code(finallyCode);
      }
      return this._endBlockNode(Catch, Finally);
    }
    // `throw` statement
    throw(error2) {
      return this._leafNode(new Throw(error2));
    }
    // start self-balancing block
    block(body, nodeCount) {
      this._blockStarts.push(this._nodes.length);
      if (body)
        this.code(body).endBlock(nodeCount);
      return this;
    }
    // end the current self-balancing block
    endBlock(nodeCount) {
      const len = this._blockStarts.pop();
      if (len === void 0)
        throw new Error("CodeGen: not in self-balancing block");
      const toClose = this._nodes.length - len;
      if (toClose < 0 || nodeCount !== void 0 && toClose !== nodeCount) {
        throw new Error(`CodeGen: wrong number of nodes: ${toClose} vs ${nodeCount} expected`);
      }
      this._nodes.length = len;
      return this;
    }
    // `function` heading (or definition if funcBody is passed)
    func(name, args = code_12.nil, async, funcBody) {
      this._blockNode(new Func(name, args, async));
      if (funcBody)
        this.code(funcBody).endFunc();
      return this;
    }
    // end function definition
    endFunc() {
      return this._endBlockNode(Func);
    }
    optimize(n = 1) {
      while (n-- > 0) {
        this._root.optimizeNodes();
        this._root.optimizeNames(this._root.names, this._constants);
      }
    }
    _leafNode(node) {
      this._currNode.nodes.push(node);
      return this;
    }
    _blockNode(node) {
      this._currNode.nodes.push(node);
      this._nodes.push(node);
    }
    _endBlockNode(N1, N2) {
      const n = this._currNode;
      if (n instanceof N1 || N2 && n instanceof N2) {
        this._nodes.pop();
        return this;
      }
      throw new Error(`CodeGen: not in block "${N2 ? `${N1.kind}/${N2.kind}` : N1.kind}"`);
    }
    _elseNode(node) {
      const n = this._currNode;
      if (!(n instanceof If)) {
        throw new Error('CodeGen: "else" without "if"');
      }
      this._currNode = n.else = node;
      return this;
    }
    get _root() {
      return this._nodes[0];
    }
    get _currNode() {
      const ns = this._nodes;
      return ns[ns.length - 1];
    }
    set _currNode(node) {
      const ns = this._nodes;
      ns[ns.length - 1] = node;
    }
  }
  exports.CodeGen = CodeGen;
  function addNames(names2, from) {
    for (const n in from)
      names2[n] = (names2[n] || 0) + (from[n] || 0);
    return names2;
  }
  function addExprNames(names2, from) {
    return from instanceof code_12._CodeOrName ? addNames(names2, from.names) : names2;
  }
  function optimizeExpr(expr, names2, constants2) {
    if (expr instanceof code_12.Name)
      return replaceName(expr);
    if (!canOptimize(expr))
      return expr;
    return new code_12._Code(expr._items.reduce((items2, c) => {
      if (c instanceof code_12.Name)
        c = replaceName(c);
      if (c instanceof code_12._Code)
        items2.push(...c._items);
      else
        items2.push(c);
      return items2;
    }, []));
    function replaceName(n) {
      const c = constants2[n.str];
      if (c === void 0 || names2[n.str] !== 1)
        return n;
      delete names2[n.str];
      return c;
    }
    function canOptimize(e) {
      return e instanceof code_12._Code && e._items.some((c) => c instanceof code_12.Name && names2[c.str] === 1 && constants2[c.str] !== void 0);
    }
  }
  function subtractNames(names2, from) {
    for (const n in from)
      names2[n] = (names2[n] || 0) - (from[n] || 0);
  }
  function not2(x) {
    return typeof x == "boolean" || typeof x == "number" || x === null ? !x : code_12._`!${par(x)}`;
  }
  exports.not = not2;
  const andCode = mappend(exports.operators.AND);
  function and(...args) {
    return args.reduce(andCode);
  }
  exports.and = and;
  const orCode = mappend(exports.operators.OR);
  function or(...args) {
    return args.reduce(orCode);
  }
  exports.or = or;
  function mappend(op) {
    return (x, y) => x === code_12.nil ? y : y === code_12.nil ? x : code_12._`${par(x)} ${op} ${par(y)}`;
  }
  function par(x) {
    return x instanceof code_12.Name ? x : code_12._`(${x})`;
  }
})(codegen);
var names$1 = {};
Object.defineProperty(names$1, "__esModule", { value: true });
const codegen_1$m = codegen;
const names = {
  // validation function arguments
  data: new codegen_1$m.Name("data"),
  // args passed from referencing schema
  valCxt: new codegen_1$m.Name("valCxt"),
  dataPath: new codegen_1$m.Name("dataPath"),
  parentData: new codegen_1$m.Name("parentData"),
  parentDataProperty: new codegen_1$m.Name("parentDataProperty"),
  rootData: new codegen_1$m.Name("rootData"),
  dynamicAnchors: new codegen_1$m.Name("dynamicAnchors"),
  // function scoped variables
  vErrors: new codegen_1$m.Name("vErrors"),
  errors: new codegen_1$m.Name("errors"),
  this: new codegen_1$m.Name("this"),
  // "globals"
  self: new codegen_1$m.Name("self"),
  scope: new codegen_1$m.Name("scope"),
  // JTD serialize/parse name for JSON string and position
  json: new codegen_1$m.Name("json"),
  jsonPos: new codegen_1$m.Name("jsonPos"),
  jsonLen: new codegen_1$m.Name("jsonLen"),
  jsonPart: new codegen_1$m.Name("jsonPart")
};
names$1.default = names;
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.extendErrors = exports.resetErrorsCount = exports.reportExtraError = exports.reportError = exports.keyword$DataError = exports.keywordError = void 0;
  const codegen_12 = codegen;
  const names_12 = names$1;
  exports.keywordError = {
    message: ({ keyword: keyword2 }) => codegen_12.str`should pass "${keyword2}" keyword validation`
  };
  exports.keyword$DataError = {
    message: ({ keyword: keyword2, schemaType }) => schemaType ? codegen_12.str`"${keyword2}" keyword must be ${schemaType} ($data)` : codegen_12.str`"${keyword2}" keyword is invalid ($data)`
  };
  function reportError(cxt, error2 = exports.keywordError, overrideAllErrors) {
    const { it } = cxt;
    const { gen, compositeRule, allErrors } = it;
    const errObj = errorObjectCode(cxt, error2);
    if (overrideAllErrors !== null && overrideAllErrors !== void 0 ? overrideAllErrors : compositeRule || allErrors) {
      addError(gen, errObj);
    } else {
      returnErrors(it, codegen_12._`[${errObj}]`);
    }
  }
  exports.reportError = reportError;
  function reportExtraError(cxt, error2 = exports.keywordError) {
    const { it } = cxt;
    const { gen, compositeRule, allErrors } = it;
    const errObj = errorObjectCode(cxt, error2);
    addError(gen, errObj);
    if (!(compositeRule || allErrors)) {
      returnErrors(it, names_12.default.vErrors);
    }
  }
  exports.reportExtraError = reportExtraError;
  function resetErrorsCount(gen, errsCount) {
    gen.assign(names_12.default.errors, errsCount);
    gen.if(codegen_12._`${names_12.default.vErrors} !== null`, () => gen.if(errsCount, () => gen.assign(codegen_12._`${names_12.default.vErrors}.length`, errsCount), () => gen.assign(names_12.default.vErrors, null)));
  }
  exports.resetErrorsCount = resetErrorsCount;
  function extendErrors({ gen, keyword: keyword2, schemaValue, data, errsCount, it }) {
    if (errsCount === void 0)
      throw new Error("ajv implementation error");
    const err = gen.name("err");
    gen.forRange("i", errsCount, names_12.default.errors, (i) => {
      gen.const(err, codegen_12._`${names_12.default.vErrors}[${i}]`);
      gen.if(codegen_12._`${err}.dataPath === undefined`, () => gen.assign(codegen_12._`${err}.dataPath`, codegen_12.strConcat(names_12.default.dataPath, it.errorPath)));
      gen.assign(codegen_12._`${err}.schemaPath`, codegen_12.str`${it.errSchemaPath}/${keyword2}`);
      if (it.opts.verbose) {
        gen.assign(codegen_12._`${err}.schema`, schemaValue);
        gen.assign(codegen_12._`${err}.data`, data);
      }
    });
  }
  exports.extendErrors = extendErrors;
  function addError(gen, errObj) {
    const err = gen.const("err", errObj);
    gen.if(codegen_12._`${names_12.default.vErrors} === null`, () => gen.assign(names_12.default.vErrors, codegen_12._`[${err}]`), codegen_12._`${names_12.default.vErrors}.push(${err})`);
    gen.code(codegen_12._`${names_12.default.errors}++`);
  }
  function returnErrors(it, errs) {
    const { gen, validateName, schemaEnv } = it;
    if (schemaEnv.$async) {
      gen.throw(codegen_12._`new ${it.ValidationError}(${errs})`);
    } else {
      gen.assign(codegen_12._`${validateName}.errors`, errs);
      gen.return(false);
    }
  }
  const E = {
    keyword: new codegen_12.Name("keyword"),
    schemaPath: new codegen_12.Name("schemaPath"),
    params: new codegen_12.Name("params"),
    propertyName: new codegen_12.Name("propertyName"),
    message: new codegen_12.Name("message"),
    schema: new codegen_12.Name("schema"),
    parentSchema: new codegen_12.Name("parentSchema"),
    // JTD error properties
    instancePath: new codegen_12.Name("instancePath")
  };
  function errorObjectCode(cxt, error2) {
    const { createErrors, opts } = cxt.it;
    if (createErrors === false)
      return codegen_12._`{}`;
    return (opts.jtd && !opts.ajvErrors ? jtdErrorObject : ajvErrorObject)(cxt, error2);
  }
  function jtdErrorObject(cxt, { message }) {
    const { gen, keyword: keyword2, it } = cxt;
    const { errorPath, errSchemaPath, opts } = it;
    const keyValues = [
      [E.instancePath, codegen_12.strConcat(names_12.default.dataPath, errorPath)],
      [E.schemaPath, codegen_12.str`${errSchemaPath}/${keyword2}`]
    ];
    if (opts.messages) {
      keyValues.push([E.message, typeof message == "function" ? message(cxt) : message]);
    }
    return gen.object(...keyValues);
  }
  function ajvErrorObject(cxt, error2) {
    const { gen, keyword: keyword2, data, schemaValue, it } = cxt;
    const { topSchemaRef, schemaPath, errorPath, errSchemaPath, propertyName, opts } = it;
    const { params, message } = error2;
    const keyValues = [
      [E.keyword, keyword2],
      [names_12.default.dataPath, codegen_12.strConcat(names_12.default.dataPath, errorPath)],
      [E.schemaPath, codegen_12.str`${errSchemaPath}/${keyword2}`],
      [E.params, typeof params == "function" ? params(cxt) : params || codegen_12._`{}`]
    ];
    if (propertyName)
      keyValues.push([E.propertyName, propertyName]);
    if (opts.messages) {
      keyValues.push([E.message, typeof message == "function" ? message(cxt) : message]);
    }
    if (opts.verbose) {
      keyValues.push([E.schema, schemaValue], [E.parentSchema, codegen_12._`${topSchemaRef}${schemaPath}`], [names_12.default.data, data]);
    }
    return gen.object(...keyValues);
  }
})(errors$1);
var util$1 = {};
var validate = {};
var boolSchema = {};
Object.defineProperty(boolSchema, "__esModule", { value: true });
boolSchema.boolOrEmptySchema = boolSchema.topBoolOrEmptySchema = void 0;
const errors_1 = errors$1;
const codegen_1$l = codegen;
const names_1$3 = names$1;
const boolError = {
  message: "boolean schema is false"
};
function topBoolOrEmptySchema(it) {
  const { gen, schema, validateName } = it;
  if (schema === false) {
    falseSchemaError(it, false);
  } else if (typeof schema == "object" && schema.$async === true) {
    gen.return(names_1$3.default.data);
  } else {
    gen.assign(codegen_1$l._`${validateName}.errors`, null);
    gen.return(true);
  }
}
boolSchema.topBoolOrEmptySchema = topBoolOrEmptySchema;
function boolOrEmptySchema(it, valid2) {
  const { gen, schema } = it;
  if (schema === false) {
    gen.var(valid2, false);
    falseSchemaError(it);
  } else {
    gen.var(valid2, true);
  }
}
boolSchema.boolOrEmptySchema = boolOrEmptySchema;
function falseSchemaError(it, overrideAllErrors) {
  const { gen, data } = it;
  const cxt = {
    gen,
    keyword: "false schema",
    data,
    schema: false,
    schemaCode: false,
    schemaValue: false,
    params: {},
    it
  };
  errors_1.reportError(cxt, boolError, overrideAllErrors);
}
var iterate = {};
var defaults = {};
var hasRequiredDefaults;
function requireDefaults() {
  if (hasRequiredDefaults) return defaults;
  hasRequiredDefaults = 1;
  Object.defineProperty(defaults, "__esModule", { value: true });
  defaults.assignDefaults = void 0;
  const codegen_12 = codegen;
  const _1 = requireValidate();
  function assignDefaults(it, ty) {
    const { properties: properties2, items: items2 } = it.schema;
    if (ty === "object" && properties2) {
      for (const key in properties2) {
        assignDefault(it, key, properties2[key].default);
      }
    } else if (ty === "array" && Array.isArray(items2)) {
      items2.forEach((sch, i) => assignDefault(it, i, sch.default));
    }
  }
  defaults.assignDefaults = assignDefaults;
  function assignDefault(it, prop, defaultValue) {
    const { gen, compositeRule, data, opts } = it;
    if (defaultValue === void 0)
      return;
    const childData = codegen_12._`${data}${codegen_12.getProperty(prop)}`;
    if (compositeRule) {
      _1.checkStrictMode(it, `default is ignored for: ${childData}`);
      return;
    }
    let condition = codegen_12._`${childData} === undefined`;
    if (opts.useDefaults === "empty") {
      condition = codegen_12._`${condition} || ${childData} === null || ${childData} === ""`;
    }
    gen.if(condition, codegen_12._`${childData} = ${codegen_12.stringify(defaultValue)}`);
  }
  return defaults;
}
var keyword = {};
var code = {};
var subschema = {};
var hasRequiredSubschema;
function requireSubschema() {
  if (hasRequiredSubschema) return subschema;
  hasRequiredSubschema = 1;
  (function(exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.applySubschema = exports.Type = void 0;
    const validate_12 = requireValidate();
    const util_12 = requireUtil();
    const codegen_12 = codegen;
    var Type;
    (function(Type2) {
      Type2[Type2["Num"] = 0] = "Num";
      Type2[Type2["Str"] = 1] = "Str";
    })(Type = exports.Type || (exports.Type = {}));
    function applySubschema(it, appl, valid2) {
      const subschema2 = getSubschema(it, appl);
      extendSubschemaData(subschema2, it, appl);
      extendSubschemaMode(subschema2, appl);
      const nextContext = { ...it, ...subschema2, items: void 0, props: void 0 };
      validate_12.subschemaCode(nextContext, valid2);
      return nextContext;
    }
    exports.applySubschema = applySubschema;
    function getSubschema(it, { keyword: keyword2, schemaProp, schema, schemaPath, errSchemaPath, topSchemaRef }) {
      if (keyword2 !== void 0 && schema !== void 0) {
        throw new Error('both "keyword" and "schema" passed, only one allowed');
      }
      if (keyword2 !== void 0) {
        const sch = it.schema[keyword2];
        return schemaProp === void 0 ? {
          schema: sch,
          schemaPath: codegen_12._`${it.schemaPath}${codegen_12.getProperty(keyword2)}`,
          errSchemaPath: `${it.errSchemaPath}/${keyword2}`
        } : {
          schema: sch[schemaProp],
          schemaPath: codegen_12._`${it.schemaPath}${codegen_12.getProperty(keyword2)}${codegen_12.getProperty(schemaProp)}`,
          errSchemaPath: `${it.errSchemaPath}/${keyword2}/${util_12.escapeFragment(schemaProp)}`
        };
      }
      if (schema !== void 0) {
        if (schemaPath === void 0 || errSchemaPath === void 0 || topSchemaRef === void 0) {
          throw new Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
        }
        return {
          schema,
          schemaPath,
          topSchemaRef,
          errSchemaPath
        };
      }
      throw new Error('either "keyword" or "schema" must be passed');
    }
    function extendSubschemaData(subschema2, it, { dataProp, dataPropType: dpType, data, dataTypes, propertyName }) {
      if (data !== void 0 && dataProp !== void 0) {
        throw new Error('both "data" and "dataProp" passed, only one allowed');
      }
      const { gen } = it;
      if (dataProp !== void 0) {
        const { errorPath, dataPathArr, opts } = it;
        const nextData = gen.let("data", codegen_12._`${it.data}${codegen_12.getProperty(dataProp)}`, true);
        dataContextProps(nextData);
        subschema2.errorPath = codegen_12.str`${errorPath}${getErrorPath(dataProp, dpType, opts.jsPropertySyntax)}`;
        subschema2.parentDataProperty = codegen_12._`${dataProp}`;
        subschema2.dataPathArr = [...dataPathArr, subschema2.parentDataProperty];
      }
      if (data !== void 0) {
        const nextData = data instanceof codegen_12.Name ? data : gen.let("data", data, true);
        dataContextProps(nextData);
        if (propertyName !== void 0)
          subschema2.propertyName = propertyName;
      }
      if (dataTypes)
        subschema2.dataTypes = dataTypes;
      function dataContextProps(_nextData) {
        subschema2.data = _nextData;
        subschema2.dataLevel = it.dataLevel + 1;
        subschema2.dataTypes = [];
        it.definedProperties = /* @__PURE__ */ new Set();
        subschema2.parentData = it.data;
        subschema2.dataNames = [...it.dataNames, _nextData];
      }
    }
    function extendSubschemaMode(subschema2, { jtdDiscriminator, jtdMetadata, compositeRule, createErrors, allErrors }) {
      if (compositeRule !== void 0)
        subschema2.compositeRule = compositeRule;
      if (createErrors !== void 0)
        subschema2.createErrors = createErrors;
      if (allErrors !== void 0)
        subschema2.allErrors = allErrors;
      subschema2.jtdDiscriminator = jtdDiscriminator;
      subschema2.jtdMetadata = jtdMetadata;
    }
    function getErrorPath(dataProp, dataPropType, jsPropertySyntax) {
      if (dataProp instanceof codegen_12.Name) {
        const isNumber = dataPropType === Type.Num;
        return jsPropertySyntax ? isNumber ? codegen_12._`"[" + ${dataProp} + "]"` : codegen_12._`"['" + ${dataProp} + "']"` : isNumber ? codegen_12._`"/" + ${dataProp}` : codegen_12._`"/" + ${dataProp}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
      }
      return jsPropertySyntax ? codegen_12.getProperty(dataProp).toString() : "/" + util_12.escapeJsonPointer(dataProp);
    }
  })(subschema);
  return subschema;
}
var hasRequiredCode;
function requireCode() {
  if (hasRequiredCode) return code;
  hasRequiredCode = 1;
  Object.defineProperty(code, "__esModule", { value: true });
  code.validateUnion = code.validateArray = code.usePattern = code.callValidateCode = code.schemaProperties = code.allSchemaProperties = code.noPropertyInData = code.propertyInData = code.isOwnProperty = code.hasPropFunc = code.reportMissingProp = code.checkMissingProp = code.checkReportMissingProp = void 0;
  const codegen_12 = codegen;
  const util_12 = requireUtil();
  const subschema_12 = requireSubschema();
  const names_12 = names$1;
  function checkReportMissingProp(cxt, prop) {
    const { gen, data, it } = cxt;
    gen.if(noPropertyInData(gen, data, prop, it.opts.ownProperties), () => {
      cxt.setParams({ missingProperty: codegen_12._`${prop}` }, true);
      cxt.error();
    });
  }
  code.checkReportMissingProp = checkReportMissingProp;
  function checkMissingProp({ gen, data, it: { opts } }, properties2, missing) {
    return codegen_12.or(...properties2.map((prop) => codegen_12.and(noPropertyInData(gen, data, prop, opts.ownProperties), codegen_12._`${missing} = ${prop}`)));
  }
  code.checkMissingProp = checkMissingProp;
  function reportMissingProp(cxt, missing) {
    cxt.setParams({ missingProperty: missing }, true);
    cxt.error();
  }
  code.reportMissingProp = reportMissingProp;
  function hasPropFunc(gen) {
    return gen.scopeValue("func", {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      ref: Object.prototype.hasOwnProperty,
      code: codegen_12._`Object.prototype.hasOwnProperty`
    });
  }
  code.hasPropFunc = hasPropFunc;
  function isOwnProperty(gen, data, property) {
    return codegen_12._`${hasPropFunc(gen)}.call(${data}, ${property})`;
  }
  code.isOwnProperty = isOwnProperty;
  function propertyInData(gen, data, property, ownProperties) {
    const cond = codegen_12._`${data}${codegen_12.getProperty(property)} !== undefined`;
    return ownProperties ? codegen_12._`${cond} && ${isOwnProperty(gen, data, property)}` : cond;
  }
  code.propertyInData = propertyInData;
  function noPropertyInData(gen, data, property, ownProperties) {
    const cond = codegen_12._`${data}${codegen_12.getProperty(property)} === undefined`;
    return ownProperties ? codegen_12.or(cond, codegen_12.not(isOwnProperty(gen, data, property))) : cond;
  }
  code.noPropertyInData = noPropertyInData;
  function allSchemaProperties(schemaMap) {
    return schemaMap ? Object.keys(schemaMap).filter((p) => p !== "__proto__") : [];
  }
  code.allSchemaProperties = allSchemaProperties;
  function schemaProperties(it, schemaMap) {
    return allSchemaProperties(schemaMap).filter((p) => !util_12.alwaysValidSchema(it, schemaMap[p]));
  }
  code.schemaProperties = schemaProperties;
  function callValidateCode({ schemaCode, data, it: { gen, topSchemaRef, schemaPath, errorPath }, it }, func, context2, passSchema) {
    const dataAndSchema = passSchema ? codegen_12._`${schemaCode}, ${data}, ${topSchemaRef}${schemaPath}` : data;
    const valCxt = [
      [names_12.default.dataPath, codegen_12.strConcat(names_12.default.dataPath, errorPath)],
      [names_12.default.parentData, it.parentData],
      [names_12.default.parentDataProperty, it.parentDataProperty],
      [names_12.default.rootData, names_12.default.rootData]
    ];
    if (it.opts.dynamicRef)
      valCxt.push([names_12.default.dynamicAnchors, names_12.default.dynamicAnchors]);
    const args = codegen_12._`${dataAndSchema}, ${gen.object(...valCxt)}`;
    return context2 !== codegen_12.nil ? codegen_12._`${func}.call(${context2}, ${args})` : codegen_12._`${func}(${args})`;
  }
  code.callValidateCode = callValidateCode;
  function usePattern(gen, pattern2) {
    return gen.scopeValue("pattern", {
      key: pattern2,
      ref: new RegExp(pattern2, "u"),
      code: codegen_12._`new RegExp(${pattern2}, "u")`
    });
  }
  code.usePattern = usePattern;
  function validateArray(cxt) {
    const { gen, data, keyword: keyword2, it } = cxt;
    const valid2 = gen.name("valid");
    if (it.allErrors) {
      const validArr = gen.let("valid", true);
      validateItems(() => gen.assign(validArr, false));
      return validArr;
    }
    gen.var(valid2, true);
    validateItems(() => gen.break());
    return valid2;
    function validateItems(notValid) {
      const len = gen.const("len", codegen_12._`${data}.length`);
      gen.forRange("i", 0, len, (i) => {
        cxt.subschema({
          keyword: keyword2,
          dataProp: i,
          dataPropType: subschema_12.Type.Num
        }, valid2);
        gen.if(codegen_12.not(valid2), notValid);
      });
    }
  }
  code.validateArray = validateArray;
  function validateUnion(cxt) {
    const { gen, schema, keyword: keyword2, it } = cxt;
    if (!Array.isArray(schema))
      throw new Error("ajv implementation error");
    const alwaysValid = schema.some((sch) => util_12.alwaysValidSchema(it, sch));
    if (alwaysValid && !it.opts.unevaluated)
      return;
    const valid2 = gen.let("valid", false);
    const schValid = gen.name("_valid");
    gen.block(() => schema.forEach((_sch, i) => {
      const schCxt = cxt.subschema({
        keyword: keyword2,
        schemaProp: i,
        compositeRule: true
      }, schValid);
      gen.assign(valid2, codegen_12._`${valid2} || ${schValid}`);
      const merged = cxt.mergeValidEvaluated(schCxt, schValid);
      if (!merged)
        gen.if(codegen_12.not(valid2));
    }));
    cxt.result(valid2, () => cxt.reset(), () => cxt.error(true));
  }
  code.validateUnion = validateUnion;
  return code;
}
var hasRequiredKeyword;
function requireKeyword() {
  if (hasRequiredKeyword) return keyword;
  hasRequiredKeyword = 1;
  Object.defineProperty(keyword, "__esModule", { value: true });
  keyword.keywordCode = void 0;
  const context_12 = requireContext();
  const errors_12 = errors$1;
  const code_12 = requireCode();
  const codegen_12 = codegen;
  const names_12 = names$1;
  function keywordCode(it, keyword2, def2, ruleType) {
    const cxt = new context_12.default(it, def2, keyword2);
    if ("code" in def2) {
      def2.code(cxt, ruleType);
    } else if (cxt.$data && def2.validate) {
      funcKeywordCode(cxt, def2);
    } else if ("macro" in def2) {
      macroKeywordCode(cxt, def2);
    } else if (def2.compile || def2.validate) {
      funcKeywordCode(cxt, def2);
    }
  }
  keyword.keywordCode = keywordCode;
  function macroKeywordCode(cxt, def2) {
    const { gen, keyword: keyword2, schema, parentSchema, it } = cxt;
    const macroSchema = def2.macro.call(it.self, schema, parentSchema, it);
    const schemaRef = useKeyword(gen, keyword2, macroSchema);
    if (it.opts.validateSchema !== false)
      it.self.validateSchema(macroSchema, true);
    const valid2 = gen.name("valid");
    cxt.subschema({
      schema: macroSchema,
      schemaPath: codegen_12.nil,
      errSchemaPath: `${it.errSchemaPath}/${keyword2}`,
      topSchemaRef: schemaRef,
      compositeRule: true
    }, valid2);
    cxt.pass(valid2, () => cxt.error(true));
  }
  function funcKeywordCode(cxt, def2) {
    var _a;
    const { gen, keyword: keyword2, schema, parentSchema, $data, it } = cxt;
    checkAsync(it, def2);
    const validate2 = !$data && def2.compile ? def2.compile.call(it.self, schema, parentSchema, it) : def2.validate;
    const validateRef = useKeyword(gen, keyword2, validate2);
    const valid2 = gen.let("valid");
    cxt.block$data(valid2, validateKeyword);
    cxt.ok((_a = def2.valid) !== null && _a !== void 0 ? _a : valid2);
    function validateKeyword() {
      if (def2.errors === false) {
        assignValid();
        if (def2.modifying)
          modifyData(cxt);
        reportErrs(() => cxt.error());
      } else {
        const ruleErrs = def2.async ? validateAsync() : validateSync();
        if (def2.modifying)
          modifyData(cxt);
        reportErrs(() => addErrs(cxt, ruleErrs));
      }
    }
    function validateAsync() {
      const ruleErrs = gen.let("ruleErrs", null);
      gen.try(() => assignValid(codegen_12._`await `), (e) => gen.assign(valid2, false).if(codegen_12._`${e} instanceof ${it.ValidationError}`, () => gen.assign(ruleErrs, codegen_12._`${e}.errors`), () => gen.throw(e)));
      return ruleErrs;
    }
    function validateSync() {
      const validateErrs = codegen_12._`${validateRef}.errors`;
      gen.assign(validateErrs, null);
      assignValid(codegen_12.nil);
      return validateErrs;
    }
    function assignValid(_await = def2.async ? codegen_12._`await ` : codegen_12.nil) {
      const passCxt = it.opts.passContext ? names_12.default.this : names_12.default.self;
      const passSchema = !("compile" in def2 && !$data || def2.schema === false);
      gen.assign(valid2, codegen_12._`${_await}${code_12.callValidateCode(cxt, validateRef, passCxt, passSchema)}`, def2.modifying);
    }
    function reportErrs(errors2) {
      var _a2;
      gen.if(codegen_12.not((_a2 = def2.valid) !== null && _a2 !== void 0 ? _a2 : valid2), errors2);
    }
  }
  function modifyData(cxt) {
    const { gen, data, it } = cxt;
    gen.if(it.parentData, () => gen.assign(data, codegen_12._`${it.parentData}[${it.parentDataProperty}]`));
  }
  function addErrs(cxt, errs) {
    const { gen } = cxt;
    gen.if(codegen_12._`Array.isArray(${errs})`, () => {
      gen.assign(names_12.default.vErrors, codegen_12._`${names_12.default.vErrors} === null ? ${errs} : ${names_12.default.vErrors}.concat(${errs})`).assign(names_12.default.errors, codegen_12._`${names_12.default.vErrors}.length`);
      errors_12.extendErrors(cxt);
    }, () => cxt.error());
  }
  function checkAsync({ schemaEnv }, def2) {
    if (def2.async && !schemaEnv.$async)
      throw new Error("async keyword in sync schema");
  }
  function useKeyword(gen, keyword2, result) {
    if (result === void 0)
      throw new Error(`keyword "${keyword2}" failed to compile`);
    return gen.scopeValue("keyword", typeof result == "function" ? { ref: result } : { ref: result, code: codegen_12.stringify(result) });
  }
  return keyword;
}
var hasRequiredIterate;
function requireIterate() {
  if (hasRequiredIterate) return iterate;
  hasRequiredIterate = 1;
  Object.defineProperty(iterate, "__esModule", { value: true });
  iterate.schemaKeywords = void 0;
  const applicability_1 = applicability;
  const dataType_12 = requireDataType();
  const defaults_1 = requireDefaults();
  const keyword_1 = requireKeyword();
  const util_12 = requireUtil();
  const _1 = requireValidate();
  const codegen_12 = codegen;
  const names_12 = names$1;
  function schemaKeywords(it, types, typeErrors, errsCount) {
    const { gen, schema, data, allErrors, opts, self: self2 } = it;
    const { RULES } = self2;
    if (schema.$ref && (opts.ignoreKeywordsWithRef || !util_12.schemaHasRulesButRef(schema, RULES))) {
      gen.block(() => keyword_1.keywordCode(it, "$ref", RULES.all.$ref.definition));
      return;
    }
    if (!opts.jtd)
      checkStrictTypes(it, types);
    gen.block(() => {
      for (const group of RULES.rules)
        groupKeywords(group);
      groupKeywords(RULES.post);
    });
    function groupKeywords(group) {
      if (!applicability_1.shouldUseGroup(schema, group))
        return;
      if (group.type) {
        gen.if(dataType_12.checkDataType(group.type, data, opts.strict));
        iterateKeywords(it, group);
        if (types.length === 1 && types[0] === group.type && typeErrors) {
          gen.else();
          dataType_12.reportTypeError(it);
        }
        gen.endIf();
      } else {
        iterateKeywords(it, group);
      }
      if (!allErrors)
        gen.if(codegen_12._`${names_12.default.errors} === ${errsCount || 0}`);
    }
  }
  iterate.schemaKeywords = schemaKeywords;
  function iterateKeywords(it, group) {
    const { gen, schema, opts: { useDefaults } } = it;
    if (useDefaults)
      defaults_1.assignDefaults(it, group.type);
    gen.block(() => {
      for (const rule of group.rules) {
        if (applicability_1.shouldUseRule(schema, rule)) {
          keyword_1.keywordCode(it, rule.keyword, rule.definition, group.type);
        }
      }
    });
  }
  function checkStrictTypes(it, types) {
    if (it.schemaEnv.meta || !it.opts.strictTypes)
      return;
    checkContextTypes(it, types);
    if (!it.opts.allowUnionTypes)
      checkMultipleTypes(it, types);
    checkKeywordTypes(it, it.dataTypes);
  }
  function checkContextTypes(it, types) {
    if (!types.length)
      return;
    if (!it.dataTypes.length) {
      it.dataTypes = types;
      return;
    }
    types.forEach((t2) => {
      if (!includesType(it.dataTypes, t2)) {
        strictTypesError(it, `type "${t2}" not allowed by context "${it.dataTypes.join(",")}"`);
      }
    });
    it.dataTypes = it.dataTypes.filter((t2) => includesType(types, t2));
  }
  function checkMultipleTypes(it, ts) {
    if (ts.length > 1 && !(ts.length === 2 && ts.includes("null"))) {
      strictTypesError(it, "use allowUnionTypes to allow union type keyword");
    }
  }
  function checkKeywordTypes(it, ts) {
    const rules2 = it.self.RULES.all;
    for (const keyword2 in rules2) {
      const rule = rules2[keyword2];
      if (typeof rule == "object" && applicability_1.shouldUseRule(it.schema, rule)) {
        const { type: type2 } = rule.definition;
        if (type2.length && !type2.some((t2) => hasApplicableType(ts, t2))) {
          strictTypesError(it, `missing type "${type2.join(",")}" for keyword "${keyword2}"`);
        }
      }
    }
  }
  function hasApplicableType(schTs, kwdT) {
    return schTs.includes(kwdT) || kwdT === "number" && schTs.includes("integer");
  }
  function includesType(ts, t2) {
    return ts.includes(t2) || t2 === "integer" && ts.includes("number");
  }
  function strictTypesError(it, msg) {
    const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
    msg += ` at "${schemaPath}" (strictTypes)`;
    _1.checkStrictMode(it, msg, it.opts.strictTypes);
  }
  return iterate;
}
var resolve$1 = {};
var fastDeepEqual = function equal(a, b) {
  if (a === b) return true;
  if (a && b && typeof a == "object" && typeof b == "object") {
    if (a.constructor !== b.constructor) return false;
    var length, i, keys;
    if (Array.isArray(a)) {
      length = a.length;
      if (length != b.length) return false;
      for (i = length; i-- !== 0; )
        if (!equal(a[i], b[i])) return false;
      return true;
    }
    if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
    if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
    if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();
    keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) return false;
    for (i = length; i-- !== 0; )
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
    for (i = length; i-- !== 0; ) {
      var key = keys[i];
      if (!equal(a[key], b[key])) return false;
    }
    return true;
  }
  return a !== a && b !== b;
};
var jsonSchemaTraverse = { exports: {} };
var traverse = jsonSchemaTraverse.exports = function(schema, opts, cb) {
  if (typeof opts == "function") {
    cb = opts;
    opts = {};
  }
  cb = opts.cb || cb;
  var pre = typeof cb == "function" ? cb : cb.pre || function() {
  };
  var post = cb.post || function() {
  };
  _traverse(opts, pre, post, schema, "", schema);
};
traverse.keywords = {
  additionalItems: true,
  items: true,
  contains: true,
  additionalProperties: true,
  propertyNames: true,
  not: true,
  if: true,
  then: true,
  else: true
};
traverse.arrayKeywords = {
  items: true,
  allOf: true,
  anyOf: true,
  oneOf: true
};
traverse.propsKeywords = {
  $defs: true,
  definitions: true,
  properties: true,
  patternProperties: true,
  dependencies: true
};
traverse.skipKeywords = {
  default: true,
  enum: true,
  const: true,
  required: true,
  maximum: true,
  minimum: true,
  exclusiveMaximum: true,
  exclusiveMinimum: true,
  multipleOf: true,
  maxLength: true,
  minLength: true,
  pattern: true,
  format: true,
  maxItems: true,
  minItems: true,
  uniqueItems: true,
  maxProperties: true,
  minProperties: true
};
function _traverse(opts, pre, post, schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
  if (schema && typeof schema == "object" && !Array.isArray(schema)) {
    pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
    for (var key in schema) {
      var sch = schema[key];
      if (Array.isArray(sch)) {
        if (key in traverse.arrayKeywords) {
          for (var i = 0; i < sch.length; i++)
            _traverse(opts, pre, post, sch[i], jsonPtr + "/" + key + "/" + i, rootSchema, jsonPtr, key, schema, i);
        }
      } else if (key in traverse.propsKeywords) {
        if (sch && typeof sch == "object") {
          for (var prop in sch)
            _traverse(opts, pre, post, sch[prop], jsonPtr + "/" + key + "/" + escapeJsonPtr(prop), rootSchema, jsonPtr, key, schema, prop);
        }
      } else if (key in traverse.keywords || opts.allKeys && !(key in traverse.skipKeywords)) {
        _traverse(opts, pre, post, sch, jsonPtr + "/" + key, rootSchema, jsonPtr, key, schema);
      }
    }
    post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
  }
}
function escapeJsonPtr(str) {
  return str.replace(/~/g, "~0").replace(/\//g, "~1");
}
var jsonSchemaTraverseExports = jsonSchemaTraverse.exports;
var uri_all = { exports: {} };
/** @license URI.js v4.4.1 (c) 2011 Gary Court. License: http://github.com/garycourt/uri-js */
(function(module, exports) {
  (function(global2, factory) {
    factory(exports);
  })(commonjsGlobal, function(exports2) {
    function merge() {
      for (var _len = arguments.length, sets = Array(_len), _key = 0; _key < _len; _key++) {
        sets[_key] = arguments[_key];
      }
      if (sets.length > 1) {
        sets[0] = sets[0].slice(0, -1);
        var xl = sets.length - 1;
        for (var x = 1; x < xl; ++x) {
          sets[x] = sets[x].slice(1, -1);
        }
        sets[xl] = sets[xl].slice(1);
        return sets.join("");
      } else {
        return sets[0];
      }
    }
    function subexp(str) {
      return "(?:" + str + ")";
    }
    function typeOf(o) {
      return o === void 0 ? "undefined" : o === null ? "null" : Object.prototype.toString.call(o).split(" ").pop().split("]").shift().toLowerCase();
    }
    function toUpperCase(str) {
      return str.toUpperCase();
    }
    function toArray(obj) {
      return obj !== void 0 && obj !== null ? obj instanceof Array ? obj : typeof obj.length !== "number" || obj.split || obj.setInterval || obj.call ? [obj] : Array.prototype.slice.call(obj) : [];
    }
    function assign(target, source2) {
      var obj = target;
      if (source2) {
        for (var key in source2) {
          obj[key] = source2[key];
        }
      }
      return obj;
    }
    function buildExps(isIRI) {
      var ALPHA$$ = "[A-Za-z]", DIGIT$$ = "[0-9]", HEXDIG$$2 = merge(DIGIT$$, "[A-Fa-f]"), PCT_ENCODED$2 = subexp(subexp("%[EFef]" + HEXDIG$$2 + "%" + HEXDIG$$2 + HEXDIG$$2 + "%" + HEXDIG$$2 + HEXDIG$$2) + "|" + subexp("%[89A-Fa-f]" + HEXDIG$$2 + "%" + HEXDIG$$2 + HEXDIG$$2) + "|" + subexp("%" + HEXDIG$$2 + HEXDIG$$2)), GEN_DELIMS$$ = "[\\:\\/\\?\\#\\[\\]\\@]", SUB_DELIMS$$ = "[\\!\\$\\&\\'\\(\\)\\*\\+\\,\\;\\=]", RESERVED$$ = merge(GEN_DELIMS$$, SUB_DELIMS$$), UCSCHAR$$ = isIRI ? "[\\xA0-\\u200D\\u2010-\\u2029\\u202F-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF]" : "[]", IPRIVATE$$ = isIRI ? "[\\uE000-\\uF8FF]" : "[]", UNRESERVED$$2 = merge(ALPHA$$, DIGIT$$, "[\\-\\.\\_\\~]", UCSCHAR$$);
      subexp(ALPHA$$ + merge(ALPHA$$, DIGIT$$, "[\\+\\-\\.]") + "*");
      subexp(subexp(PCT_ENCODED$2 + "|" + merge(UNRESERVED$$2, SUB_DELIMS$$, "[\\:]")) + "*");
      var DEC_OCTET_RELAXED$ = subexp(subexp("25[0-5]") + "|" + subexp("2[0-4]" + DIGIT$$) + "|" + subexp("1" + DIGIT$$ + DIGIT$$) + "|" + subexp("0?[1-9]" + DIGIT$$) + "|0?0?" + DIGIT$$), IPV4ADDRESS$ = subexp(DEC_OCTET_RELAXED$ + "\\." + DEC_OCTET_RELAXED$ + "\\." + DEC_OCTET_RELAXED$ + "\\." + DEC_OCTET_RELAXED$), H16$ = subexp(HEXDIG$$2 + "{1,4}"), LS32$ = subexp(subexp(H16$ + "\\:" + H16$) + "|" + IPV4ADDRESS$), IPV6ADDRESS1$ = subexp(subexp(H16$ + "\\:") + "{6}" + LS32$), IPV6ADDRESS2$ = subexp("\\:\\:" + subexp(H16$ + "\\:") + "{5}" + LS32$), IPV6ADDRESS3$ = subexp(subexp(H16$) + "?\\:\\:" + subexp(H16$ + "\\:") + "{4}" + LS32$), IPV6ADDRESS4$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,1}" + H16$) + "?\\:\\:" + subexp(H16$ + "\\:") + "{3}" + LS32$), IPV6ADDRESS5$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,2}" + H16$) + "?\\:\\:" + subexp(H16$ + "\\:") + "{2}" + LS32$), IPV6ADDRESS6$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,3}" + H16$) + "?\\:\\:" + H16$ + "\\:" + LS32$), IPV6ADDRESS7$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,4}" + H16$) + "?\\:\\:" + LS32$), IPV6ADDRESS8$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,5}" + H16$) + "?\\:\\:" + H16$), IPV6ADDRESS9$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,6}" + H16$) + "?\\:\\:"), IPV6ADDRESS$ = subexp([IPV6ADDRESS1$, IPV6ADDRESS2$, IPV6ADDRESS3$, IPV6ADDRESS4$, IPV6ADDRESS5$, IPV6ADDRESS6$, IPV6ADDRESS7$, IPV6ADDRESS8$, IPV6ADDRESS9$].join("|")), ZONEID$ = subexp(subexp(UNRESERVED$$2 + "|" + PCT_ENCODED$2) + "+");
      subexp("[vV]" + HEXDIG$$2 + "+\\." + merge(UNRESERVED$$2, SUB_DELIMS$$, "[\\:]") + "+");
      subexp(subexp(PCT_ENCODED$2 + "|" + merge(UNRESERVED$$2, SUB_DELIMS$$)) + "*");
      var PCHAR$ = subexp(PCT_ENCODED$2 + "|" + merge(UNRESERVED$$2, SUB_DELIMS$$, "[\\:\\@]"));
      subexp(subexp(PCT_ENCODED$2 + "|" + merge(UNRESERVED$$2, SUB_DELIMS$$, "[\\@]")) + "+");
      subexp(subexp(PCHAR$ + "|" + merge("[\\/\\?]", IPRIVATE$$)) + "*");
      return {
        NOT_SCHEME: new RegExp(merge("[^]", ALPHA$$, DIGIT$$, "[\\+\\-\\.]"), "g"),
        NOT_USERINFO: new RegExp(merge("[^\\%\\:]", UNRESERVED$$2, SUB_DELIMS$$), "g"),
        NOT_HOST: new RegExp(merge("[^\\%\\[\\]\\:]", UNRESERVED$$2, SUB_DELIMS$$), "g"),
        NOT_PATH: new RegExp(merge("[^\\%\\/\\:\\@]", UNRESERVED$$2, SUB_DELIMS$$), "g"),
        NOT_PATH_NOSCHEME: new RegExp(merge("[^\\%\\/\\@]", UNRESERVED$$2, SUB_DELIMS$$), "g"),
        NOT_QUERY: new RegExp(merge("[^\\%]", UNRESERVED$$2, SUB_DELIMS$$, "[\\:\\@\\/\\?]", IPRIVATE$$), "g"),
        NOT_FRAGMENT: new RegExp(merge("[^\\%]", UNRESERVED$$2, SUB_DELIMS$$, "[\\:\\@\\/\\?]"), "g"),
        ESCAPE: new RegExp(merge("[^]", UNRESERVED$$2, SUB_DELIMS$$), "g"),
        UNRESERVED: new RegExp(UNRESERVED$$2, "g"),
        OTHER_CHARS: new RegExp(merge("[^\\%]", UNRESERVED$$2, RESERVED$$), "g"),
        PCT_ENCODED: new RegExp(PCT_ENCODED$2, "g"),
        IPV4ADDRESS: new RegExp("^(" + IPV4ADDRESS$ + ")$"),
        IPV6ADDRESS: new RegExp("^\\[?(" + IPV6ADDRESS$ + ")" + subexp(subexp("\\%25|\\%(?!" + HEXDIG$$2 + "{2})") + "(" + ZONEID$ + ")") + "?\\]?$")
        //RFC 6874, with relaxed parsing rules
      };
    }
    var URI_PROTOCOL = buildExps(false);
    var IRI_PROTOCOL = buildExps(true);
    var slicedToArray = /* @__PURE__ */ function() {
      function sliceIterator(arr, i) {
        var _arr = [];
        var _n = true;
        var _d = false;
        var _e = void 0;
        try {
          for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
            _arr.push(_s.value);
            if (i && _arr.length === i) break;
          }
        } catch (err) {
          _d = true;
          _e = err;
        } finally {
          try {
            if (!_n && _i["return"]) _i["return"]();
          } finally {
            if (_d) throw _e;
          }
        }
        return _arr;
      }
      return function(arr, i) {
        if (Array.isArray(arr)) {
          return arr;
        } else if (Symbol.iterator in Object(arr)) {
          return sliceIterator(arr, i);
        } else {
          throw new TypeError("Invalid attempt to destructure non-iterable instance");
        }
      };
    }();
    var toConsumableArray = function(arr) {
      if (Array.isArray(arr)) {
        for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];
        return arr2;
      } else {
        return Array.from(arr);
      }
    };
    var maxInt = 2147483647;
    var base = 36;
    var tMin = 1;
    var tMax = 26;
    var skew = 38;
    var damp = 700;
    var initialBias = 72;
    var initialN = 128;
    var delimiter = "-";
    var regexPunycode = /^xn--/;
    var regexNonASCII = /[^\0-\x7E]/;
    var regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g;
    var errors2 = {
      "overflow": "Overflow: input needs wider integers to process",
      "not-basic": "Illegal input >= 0x80 (not a basic code point)",
      "invalid-input": "Invalid input"
    };
    var baseMinusTMin = base - tMin;
    var floor = Math.floor;
    var stringFromCharCode = String.fromCharCode;
    function error$12(type2) {
      throw new RangeError(errors2[type2]);
    }
    function map(array, fn) {
      var result = [];
      var length = array.length;
      while (length--) {
        result[length] = fn(array[length]);
      }
      return result;
    }
    function mapDomain(string, fn) {
      var parts = string.split("@");
      var result = "";
      if (parts.length > 1) {
        result = parts[0] + "@";
        string = parts[1];
      }
      string = string.replace(regexSeparators, ".");
      var labels = string.split(".");
      var encoded = map(labels, fn).join(".");
      return result + encoded;
    }
    function ucs2decode(string) {
      var output = [];
      var counter = 0;
      var length = string.length;
      while (counter < length) {
        var value = string.charCodeAt(counter++);
        if (value >= 55296 && value <= 56319 && counter < length) {
          var extra = string.charCodeAt(counter++);
          if ((extra & 64512) == 56320) {
            output.push(((value & 1023) << 10) + (extra & 1023) + 65536);
          } else {
            output.push(value);
            counter--;
          }
        } else {
          output.push(value);
        }
      }
      return output;
    }
    var ucs2encode = function ucs2encode2(array) {
      return String.fromCodePoint.apply(String, toConsumableArray(array));
    };
    var basicToDigit = function basicToDigit2(codePoint) {
      if (codePoint - 48 < 10) {
        return codePoint - 22;
      }
      if (codePoint - 65 < 26) {
        return codePoint - 65;
      }
      if (codePoint - 97 < 26) {
        return codePoint - 97;
      }
      return base;
    };
    var digitToBasic = function digitToBasic2(digit, flag) {
      return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
    };
    var adapt = function adapt2(delta, numPoints, firstTime) {
      var k = 0;
      delta = firstTime ? floor(delta / damp) : delta >> 1;
      delta += floor(delta / numPoints);
      for (
        ;
        /* no initialization */
        delta > baseMinusTMin * tMax >> 1;
        k += base
      ) {
        delta = floor(delta / baseMinusTMin);
      }
      return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
    };
    var decode = function decode2(input) {
      var output = [];
      var inputLength = input.length;
      var i = 0;
      var n = initialN;
      var bias = initialBias;
      var basic = input.lastIndexOf(delimiter);
      if (basic < 0) {
        basic = 0;
      }
      for (var j = 0; j < basic; ++j) {
        if (input.charCodeAt(j) >= 128) {
          error$12("not-basic");
        }
        output.push(input.charCodeAt(j));
      }
      for (var index = basic > 0 ? basic + 1 : 0; index < inputLength; ) {
        var oldi = i;
        for (
          var w = 1, k = base;
          ;
          /* no condition */
          k += base
        ) {
          if (index >= inputLength) {
            error$12("invalid-input");
          }
          var digit = basicToDigit(input.charCodeAt(index++));
          if (digit >= base || digit > floor((maxInt - i) / w)) {
            error$12("overflow");
          }
          i += digit * w;
          var t2 = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
          if (digit < t2) {
            break;
          }
          var baseMinusT = base - t2;
          if (w > floor(maxInt / baseMinusT)) {
            error$12("overflow");
          }
          w *= baseMinusT;
        }
        var out = output.length + 1;
        bias = adapt(i - oldi, out, oldi == 0);
        if (floor(i / out) > maxInt - n) {
          error$12("overflow");
        }
        n += floor(i / out);
        i %= out;
        output.splice(i++, 0, n);
      }
      return String.fromCodePoint.apply(String, output);
    };
    var encode = function encode2(input) {
      var output = [];
      input = ucs2decode(input);
      var inputLength = input.length;
      var n = initialN;
      var delta = 0;
      var bias = initialBias;
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = void 0;
      try {
        for (var _iterator = input[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var _currentValue2 = _step.value;
          if (_currentValue2 < 128) {
            output.push(stringFromCharCode(_currentValue2));
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
      var basicLength = output.length;
      var handledCPCount = basicLength;
      if (basicLength) {
        output.push(delimiter);
      }
      while (handledCPCount < inputLength) {
        var m = maxInt;
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = void 0;
        try {
          for (var _iterator2 = input[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var currentValue = _step2.value;
            if (currentValue >= n && currentValue < m) {
              m = currentValue;
            }
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }
        var handledCPCountPlusOne = handledCPCount + 1;
        if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
          error$12("overflow");
        }
        delta += (m - n) * handledCPCountPlusOne;
        n = m;
        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = void 0;
        try {
          for (var _iterator3 = input[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var _currentValue = _step3.value;
            if (_currentValue < n && ++delta > maxInt) {
              error$12("overflow");
            }
            if (_currentValue == n) {
              var q = delta;
              for (
                var k = base;
                ;
                /* no condition */
                k += base
              ) {
                var t2 = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
                if (q < t2) {
                  break;
                }
                var qMinusT = q - t2;
                var baseMinusT = base - t2;
                output.push(stringFromCharCode(digitToBasic(t2 + qMinusT % baseMinusT, 0)));
                q = floor(qMinusT / baseMinusT);
              }
              output.push(stringFromCharCode(digitToBasic(q, 0)));
              bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
              delta = 0;
              ++handledCPCount;
            }
          }
        } catch (err) {
          _didIteratorError3 = true;
          _iteratorError3 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion3 && _iterator3.return) {
              _iterator3.return();
            }
          } finally {
            if (_didIteratorError3) {
              throw _iteratorError3;
            }
          }
        }
        ++delta;
        ++n;
      }
      return output.join("");
    };
    var toUnicode = function toUnicode2(input) {
      return mapDomain(input, function(string) {
        return regexPunycode.test(string) ? decode(string.slice(4).toLowerCase()) : string;
      });
    };
    var toASCII = function toASCII2(input) {
      return mapDomain(input, function(string) {
        return regexNonASCII.test(string) ? "xn--" + encode(string) : string;
      });
    };
    var punycode = {
      /**
       * A string representing the current Punycode.js version number.
       * @memberOf punycode
       * @type String
       */
      "version": "2.1.0",
      /**
       * An object of methods to convert from JavaScript's internal character
       * representation (UCS-2) to Unicode code points, and back.
       * @see <https://mathiasbynens.be/notes/javascript-encoding>
       * @memberOf punycode
       * @type Object
       */
      "ucs2": {
        "decode": ucs2decode,
        "encode": ucs2encode
      },
      "decode": decode,
      "encode": encode,
      "toASCII": toASCII,
      "toUnicode": toUnicode
    };
    var SCHEMES = {};
    function pctEncChar(chr) {
      var c = chr.charCodeAt(0);
      var e = void 0;
      if (c < 16) e = "%0" + c.toString(16).toUpperCase();
      else if (c < 128) e = "%" + c.toString(16).toUpperCase();
      else if (c < 2048) e = "%" + (c >> 6 | 192).toString(16).toUpperCase() + "%" + (c & 63 | 128).toString(16).toUpperCase();
      else e = "%" + (c >> 12 | 224).toString(16).toUpperCase() + "%" + (c >> 6 & 63 | 128).toString(16).toUpperCase() + "%" + (c & 63 | 128).toString(16).toUpperCase();
      return e;
    }
    function pctDecChars(str) {
      var newStr = "";
      var i = 0;
      var il = str.length;
      while (i < il) {
        var c = parseInt(str.substr(i + 1, 2), 16);
        if (c < 128) {
          newStr += String.fromCharCode(c);
          i += 3;
        } else if (c >= 194 && c < 224) {
          if (il - i >= 6) {
            var c2 = parseInt(str.substr(i + 4, 2), 16);
            newStr += String.fromCharCode((c & 31) << 6 | c2 & 63);
          } else {
            newStr += str.substr(i, 6);
          }
          i += 6;
        } else if (c >= 224) {
          if (il - i >= 9) {
            var _c = parseInt(str.substr(i + 4, 2), 16);
            var c3 = parseInt(str.substr(i + 7, 2), 16);
            newStr += String.fromCharCode((c & 15) << 12 | (_c & 63) << 6 | c3 & 63);
          } else {
            newStr += str.substr(i, 9);
          }
          i += 9;
        } else {
          newStr += str.substr(i, 3);
          i += 3;
        }
      }
      return newStr;
    }
    function _normalizeComponentEncoding(components, protocol) {
      function decodeUnreserved2(str) {
        var decStr = pctDecChars(str);
        return !decStr.match(protocol.UNRESERVED) ? str : decStr;
      }
      if (components.scheme) components.scheme = String(components.scheme).replace(protocol.PCT_ENCODED, decodeUnreserved2).toLowerCase().replace(protocol.NOT_SCHEME, "");
      if (components.userinfo !== void 0) components.userinfo = String(components.userinfo).replace(protocol.PCT_ENCODED, decodeUnreserved2).replace(protocol.NOT_USERINFO, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
      if (components.host !== void 0) components.host = String(components.host).replace(protocol.PCT_ENCODED, decodeUnreserved2).toLowerCase().replace(protocol.NOT_HOST, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
      if (components.path !== void 0) components.path = String(components.path).replace(protocol.PCT_ENCODED, decodeUnreserved2).replace(components.scheme ? protocol.NOT_PATH : protocol.NOT_PATH_NOSCHEME, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
      if (components.query !== void 0) components.query = String(components.query).replace(protocol.PCT_ENCODED, decodeUnreserved2).replace(protocol.NOT_QUERY, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
      if (components.fragment !== void 0) components.fragment = String(components.fragment).replace(protocol.PCT_ENCODED, decodeUnreserved2).replace(protocol.NOT_FRAGMENT, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
      return components;
    }
    function _stripLeadingZeros(str) {
      return str.replace(/^0*(.*)/, "$1") || "0";
    }
    function _normalizeIPv4(host, protocol) {
      var matches = host.match(protocol.IPV4ADDRESS) || [];
      var _matches = slicedToArray(matches, 2), address = _matches[1];
      if (address) {
        return address.split(".").map(_stripLeadingZeros).join(".");
      } else {
        return host;
      }
    }
    function _normalizeIPv6(host, protocol) {
      var matches = host.match(protocol.IPV6ADDRESS) || [];
      var _matches2 = slicedToArray(matches, 3), address = _matches2[1], zone = _matches2[2];
      if (address) {
        var _address$toLowerCase$ = address.toLowerCase().split("::").reverse(), _address$toLowerCase$2 = slicedToArray(_address$toLowerCase$, 2), last = _address$toLowerCase$2[0], first = _address$toLowerCase$2[1];
        var firstFields = first ? first.split(":").map(_stripLeadingZeros) : [];
        var lastFields = last.split(":").map(_stripLeadingZeros);
        var isLastFieldIPv4Address = protocol.IPV4ADDRESS.test(lastFields[lastFields.length - 1]);
        var fieldCount = isLastFieldIPv4Address ? 7 : 8;
        var lastFieldsStart = lastFields.length - fieldCount;
        var fields = Array(fieldCount);
        for (var x = 0; x < fieldCount; ++x) {
          fields[x] = firstFields[x] || lastFields[lastFieldsStart + x] || "";
        }
        if (isLastFieldIPv4Address) {
          fields[fieldCount - 1] = _normalizeIPv4(fields[fieldCount - 1], protocol);
        }
        var allZeroFields = fields.reduce(function(acc, field, index) {
          if (!field || field === "0") {
            var lastLongest = acc[acc.length - 1];
            if (lastLongest && lastLongest.index + lastLongest.length === index) {
              lastLongest.length++;
            } else {
              acc.push({ index, length: 1 });
            }
          }
          return acc;
        }, []);
        var longestZeroFields = allZeroFields.sort(function(a, b) {
          return b.length - a.length;
        })[0];
        var newHost = void 0;
        if (longestZeroFields && longestZeroFields.length > 1) {
          var newFirst = fields.slice(0, longestZeroFields.index);
          var newLast = fields.slice(longestZeroFields.index + longestZeroFields.length);
          newHost = newFirst.join(":") + "::" + newLast.join(":");
        } else {
          newHost = fields.join(":");
        }
        if (zone) {
          newHost += "%" + zone;
        }
        return newHost;
      } else {
        return host;
      }
    }
    var URI_PARSE = /^(?:([^:\/?#]+):)?(?:\/\/((?:([^\/?#@]*)@)?(\[[^\/?#\]]+\]|[^\/?#:]*)(?:\:(\d*))?))?([^?#]*)(?:\?([^#]*))?(?:#((?:.|\n|\r)*))?/i;
    var NO_MATCH_IS_UNDEFINED = "".match(/(){0}/)[1] === void 0;
    function parse2(uriString) {
      var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      var components = {};
      var protocol = options.iri !== false ? IRI_PROTOCOL : URI_PROTOCOL;
      if (options.reference === "suffix") uriString = (options.scheme ? options.scheme + ":" : "") + "//" + uriString;
      var matches = uriString.match(URI_PARSE);
      if (matches) {
        if (NO_MATCH_IS_UNDEFINED) {
          components.scheme = matches[1];
          components.userinfo = matches[3];
          components.host = matches[4];
          components.port = parseInt(matches[5], 10);
          components.path = matches[6] || "";
          components.query = matches[7];
          components.fragment = matches[8];
          if (isNaN(components.port)) {
            components.port = matches[5];
          }
        } else {
          components.scheme = matches[1] || void 0;
          components.userinfo = uriString.indexOf("@") !== -1 ? matches[3] : void 0;
          components.host = uriString.indexOf("//") !== -1 ? matches[4] : void 0;
          components.port = parseInt(matches[5], 10);
          components.path = matches[6] || "";
          components.query = uriString.indexOf("?") !== -1 ? matches[7] : void 0;
          components.fragment = uriString.indexOf("#") !== -1 ? matches[8] : void 0;
          if (isNaN(components.port)) {
            components.port = uriString.match(/\/\/(?:.|\n)*\:(?:\/|\?|\#|$)/) ? matches[4] : void 0;
          }
        }
        if (components.host) {
          components.host = _normalizeIPv6(_normalizeIPv4(components.host, protocol), protocol);
        }
        if (components.scheme === void 0 && components.userinfo === void 0 && components.host === void 0 && components.port === void 0 && !components.path && components.query === void 0) {
          components.reference = "same-document";
        } else if (components.scheme === void 0) {
          components.reference = "relative";
        } else if (components.fragment === void 0) {
          components.reference = "absolute";
        } else {
          components.reference = "uri";
        }
        if (options.reference && options.reference !== "suffix" && options.reference !== components.reference) {
          components.error = components.error || "URI is not a " + options.reference + " reference.";
        }
        var schemeHandler = SCHEMES[(options.scheme || components.scheme || "").toLowerCase()];
        if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport)) {
          if (components.host && (options.domainHost || schemeHandler && schemeHandler.domainHost)) {
            try {
              components.host = punycode.toASCII(components.host.replace(protocol.PCT_ENCODED, pctDecChars).toLowerCase());
            } catch (e) {
              components.error = components.error || "Host's domain name can not be converted to ASCII via punycode: " + e;
            }
          }
          _normalizeComponentEncoding(components, URI_PROTOCOL);
        } else {
          _normalizeComponentEncoding(components, protocol);
        }
        if (schemeHandler && schemeHandler.parse) {
          schemeHandler.parse(components, options);
        }
      } else {
        components.error = components.error || "URI can not be parsed.";
      }
      return components;
    }
    function _recomposeAuthority(components, options) {
      var protocol = options.iri !== false ? IRI_PROTOCOL : URI_PROTOCOL;
      var uriTokens = [];
      if (components.userinfo !== void 0) {
        uriTokens.push(components.userinfo);
        uriTokens.push("@");
      }
      if (components.host !== void 0) {
        uriTokens.push(_normalizeIPv6(_normalizeIPv4(String(components.host), protocol), protocol).replace(protocol.IPV6ADDRESS, function(_, $1, $2) {
          return "[" + $1 + ($2 ? "%25" + $2 : "") + "]";
        }));
      }
      if (typeof components.port === "number" || typeof components.port === "string") {
        uriTokens.push(":");
        uriTokens.push(String(components.port));
      }
      return uriTokens.length ? uriTokens.join("") : void 0;
    }
    var RDS1 = /^\.\.?\//;
    var RDS2 = /^\/\.(\/|$)/;
    var RDS3 = /^\/\.\.(\/|$)/;
    var RDS5 = /^\/?(?:.|\n)*?(?=\/|$)/;
    function removeDotSegments(input) {
      var output = [];
      while (input.length) {
        if (input.match(RDS1)) {
          input = input.replace(RDS1, "");
        } else if (input.match(RDS2)) {
          input = input.replace(RDS2, "/");
        } else if (input.match(RDS3)) {
          input = input.replace(RDS3, "/");
          output.pop();
        } else if (input === "." || input === "..") {
          input = "";
        } else {
          var im = input.match(RDS5);
          if (im) {
            var s = im[0];
            input = input.slice(s.length);
            output.push(s);
          } else {
            throw new Error("Unexpected dot segment condition");
          }
        }
      }
      return output.join("");
    }
    function serialize(components) {
      var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      var protocol = options.iri ? IRI_PROTOCOL : URI_PROTOCOL;
      var uriTokens = [];
      var schemeHandler = SCHEMES[(options.scheme || components.scheme || "").toLowerCase()];
      if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(components, options);
      if (components.host) {
        if (protocol.IPV6ADDRESS.test(components.host)) ;
        else if (options.domainHost || schemeHandler && schemeHandler.domainHost) {
          try {
            components.host = !options.iri ? punycode.toASCII(components.host.replace(protocol.PCT_ENCODED, pctDecChars).toLowerCase()) : punycode.toUnicode(components.host);
          } catch (e) {
            components.error = components.error || "Host's domain name can not be converted to " + (!options.iri ? "ASCII" : "Unicode") + " via punycode: " + e;
          }
        }
      }
      _normalizeComponentEncoding(components, protocol);
      if (options.reference !== "suffix" && components.scheme) {
        uriTokens.push(components.scheme);
        uriTokens.push(":");
      }
      var authority = _recomposeAuthority(components, options);
      if (authority !== void 0) {
        if (options.reference !== "suffix") {
          uriTokens.push("//");
        }
        uriTokens.push(authority);
        if (components.path && components.path.charAt(0) !== "/") {
          uriTokens.push("/");
        }
      }
      if (components.path !== void 0) {
        var s = components.path;
        if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) {
          s = removeDotSegments(s);
        }
        if (authority === void 0) {
          s = s.replace(/^\/\//, "/%2F");
        }
        uriTokens.push(s);
      }
      if (components.query !== void 0) {
        uriTokens.push("?");
        uriTokens.push(components.query);
      }
      if (components.fragment !== void 0) {
        uriTokens.push("#");
        uriTokens.push(components.fragment);
      }
      return uriTokens.join("");
    }
    function resolveComponents(base2, relative) {
      var options = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
      var skipNormalization = arguments[3];
      var target = {};
      if (!skipNormalization) {
        base2 = parse2(serialize(base2, options), options);
        relative = parse2(serialize(relative, options), options);
      }
      options = options || {};
      if (!options.tolerant && relative.scheme) {
        target.scheme = relative.scheme;
        target.userinfo = relative.userinfo;
        target.host = relative.host;
        target.port = relative.port;
        target.path = removeDotSegments(relative.path || "");
        target.query = relative.query;
      } else {
        if (relative.userinfo !== void 0 || relative.host !== void 0 || relative.port !== void 0) {
          target.userinfo = relative.userinfo;
          target.host = relative.host;
          target.port = relative.port;
          target.path = removeDotSegments(relative.path || "");
          target.query = relative.query;
        } else {
          if (!relative.path) {
            target.path = base2.path;
            if (relative.query !== void 0) {
              target.query = relative.query;
            } else {
              target.query = base2.query;
            }
          } else {
            if (relative.path.charAt(0) === "/") {
              target.path = removeDotSegments(relative.path);
            } else {
              if ((base2.userinfo !== void 0 || base2.host !== void 0 || base2.port !== void 0) && !base2.path) {
                target.path = "/" + relative.path;
              } else if (!base2.path) {
                target.path = relative.path;
              } else {
                target.path = base2.path.slice(0, base2.path.lastIndexOf("/") + 1) + relative.path;
              }
              target.path = removeDotSegments(target.path);
            }
            target.query = relative.query;
          }
          target.userinfo = base2.userinfo;
          target.host = base2.host;
          target.port = base2.port;
        }
        target.scheme = base2.scheme;
      }
      target.fragment = relative.fragment;
      return target;
    }
    function resolve2(baseURI, relativeURI, options) {
      var schemelessOptions = assign({ scheme: "null" }, options);
      return serialize(resolveComponents(parse2(baseURI, schemelessOptions), parse2(relativeURI, schemelessOptions), schemelessOptions, true), schemelessOptions);
    }
    function normalize(uri, options) {
      if (typeof uri === "string") {
        uri = serialize(parse2(uri, options), options);
      } else if (typeOf(uri) === "object") {
        uri = parse2(serialize(uri, options), options);
      }
      return uri;
    }
    function equal3(uriA, uriB, options) {
      if (typeof uriA === "string") {
        uriA = serialize(parse2(uriA, options), options);
      } else if (typeOf(uriA) === "object") {
        uriA = serialize(uriA, options);
      }
      if (typeof uriB === "string") {
        uriB = serialize(parse2(uriB, options), options);
      } else if (typeOf(uriB) === "object") {
        uriB = serialize(uriB, options);
      }
      return uriA === uriB;
    }
    function escapeComponent(str, options) {
      return str && str.toString().replace(!options || !options.iri ? URI_PROTOCOL.ESCAPE : IRI_PROTOCOL.ESCAPE, pctEncChar);
    }
    function unescapeComponent(str, options) {
      return str && str.toString().replace(!options || !options.iri ? URI_PROTOCOL.PCT_ENCODED : IRI_PROTOCOL.PCT_ENCODED, pctDecChars);
    }
    var handler = {
      scheme: "http",
      domainHost: true,
      parse: function parse3(components, options) {
        if (!components.host) {
          components.error = components.error || "HTTP URIs must have a host.";
        }
        return components;
      },
      serialize: function serialize2(components, options) {
        var secure = String(components.scheme).toLowerCase() === "https";
        if (components.port === (secure ? 443 : 80) || components.port === "") {
          components.port = void 0;
        }
        if (!components.path) {
          components.path = "/";
        }
        return components;
      }
    };
    var handler$1 = {
      scheme: "https",
      domainHost: handler.domainHost,
      parse: handler.parse,
      serialize: handler.serialize
    };
    function isSecure(wsComponents) {
      return typeof wsComponents.secure === "boolean" ? wsComponents.secure : String(wsComponents.scheme).toLowerCase() === "wss";
    }
    var handler$2 = {
      scheme: "ws",
      domainHost: true,
      parse: function parse3(components, options) {
        var wsComponents = components;
        wsComponents.secure = isSecure(wsComponents);
        wsComponents.resourceName = (wsComponents.path || "/") + (wsComponents.query ? "?" + wsComponents.query : "");
        wsComponents.path = void 0;
        wsComponents.query = void 0;
        return wsComponents;
      },
      serialize: function serialize2(wsComponents, options) {
        if (wsComponents.port === (isSecure(wsComponents) ? 443 : 80) || wsComponents.port === "") {
          wsComponents.port = void 0;
        }
        if (typeof wsComponents.secure === "boolean") {
          wsComponents.scheme = wsComponents.secure ? "wss" : "ws";
          wsComponents.secure = void 0;
        }
        if (wsComponents.resourceName) {
          var _wsComponents$resourc = wsComponents.resourceName.split("?"), _wsComponents$resourc2 = slicedToArray(_wsComponents$resourc, 2), path2 = _wsComponents$resourc2[0], query = _wsComponents$resourc2[1];
          wsComponents.path = path2 && path2 !== "/" ? path2 : void 0;
          wsComponents.query = query;
          wsComponents.resourceName = void 0;
        }
        wsComponents.fragment = void 0;
        return wsComponents;
      }
    };
    var handler$3 = {
      scheme: "wss",
      domainHost: handler$2.domainHost,
      parse: handler$2.parse,
      serialize: handler$2.serialize
    };
    var O = {};
    var UNRESERVED$$ = "[A-Za-z0-9\\-\\.\\_\\~\\xA0-\\u200D\\u2010-\\u2029\\u202F-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF]";
    var HEXDIG$$ = "[0-9A-Fa-f]";
    var PCT_ENCODED$ = subexp(subexp("%[EFef]" + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$) + "|" + subexp("%[89A-Fa-f]" + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$) + "|" + subexp("%" + HEXDIG$$ + HEXDIG$$));
    var ATEXT$$ = "[A-Za-z0-9\\!\\$\\%\\'\\*\\+\\-\\^\\_\\`\\{\\|\\}\\~]";
    var QTEXT$$ = "[\\!\\$\\%\\'\\(\\)\\*\\+\\,\\-\\.0-9\\<\\>A-Z\\x5E-\\x7E]";
    var VCHAR$$ = merge(QTEXT$$, '[\\"\\\\]');
    var SOME_DELIMS$$ = "[\\!\\$\\'\\(\\)\\*\\+\\,\\;\\:\\@]";
    var UNRESERVED = new RegExp(UNRESERVED$$, "g");
    var PCT_ENCODED = new RegExp(PCT_ENCODED$, "g");
    var NOT_LOCAL_PART = new RegExp(merge("[^]", ATEXT$$, "[\\.]", '[\\"]', VCHAR$$), "g");
    var NOT_HFNAME = new RegExp(merge("[^]", UNRESERVED$$, SOME_DELIMS$$), "g");
    var NOT_HFVALUE = NOT_HFNAME;
    function decodeUnreserved(str) {
      var decStr = pctDecChars(str);
      return !decStr.match(UNRESERVED) ? str : decStr;
    }
    var handler$4 = {
      scheme: "mailto",
      parse: function parse$$1(components, options) {
        var mailtoComponents = components;
        var to = mailtoComponents.to = mailtoComponents.path ? mailtoComponents.path.split(",") : [];
        mailtoComponents.path = void 0;
        if (mailtoComponents.query) {
          var unknownHeaders = false;
          var headers2 = {};
          var hfields = mailtoComponents.query.split("&");
          for (var x = 0, xl = hfields.length; x < xl; ++x) {
            var hfield = hfields[x].split("=");
            switch (hfield[0]) {
              case "to":
                var toAddrs = hfield[1].split(",");
                for (var _x = 0, _xl = toAddrs.length; _x < _xl; ++_x) {
                  to.push(toAddrs[_x]);
                }
                break;
              case "subject":
                mailtoComponents.subject = unescapeComponent(hfield[1], options);
                break;
              case "body":
                mailtoComponents.body = unescapeComponent(hfield[1], options);
                break;
              default:
                unknownHeaders = true;
                headers2[unescapeComponent(hfield[0], options)] = unescapeComponent(hfield[1], options);
                break;
            }
          }
          if (unknownHeaders) mailtoComponents.headers = headers2;
        }
        mailtoComponents.query = void 0;
        for (var _x2 = 0, _xl2 = to.length; _x2 < _xl2; ++_x2) {
          var addr = to[_x2].split("@");
          addr[0] = unescapeComponent(addr[0]);
          if (!options.unicodeSupport) {
            try {
              addr[1] = punycode.toASCII(unescapeComponent(addr[1], options).toLowerCase());
            } catch (e) {
              mailtoComponents.error = mailtoComponents.error || "Email address's domain name can not be converted to ASCII via punycode: " + e;
            }
          } else {
            addr[1] = unescapeComponent(addr[1], options).toLowerCase();
          }
          to[_x2] = addr.join("@");
        }
        return mailtoComponents;
      },
      serialize: function serialize$$1(mailtoComponents, options) {
        var components = mailtoComponents;
        var to = toArray(mailtoComponents.to);
        if (to) {
          for (var x = 0, xl = to.length; x < xl; ++x) {
            var toAddr = String(to[x]);
            var atIdx = toAddr.lastIndexOf("@");
            var localPart = toAddr.slice(0, atIdx).replace(PCT_ENCODED, decodeUnreserved).replace(PCT_ENCODED, toUpperCase).replace(NOT_LOCAL_PART, pctEncChar);
            var domain = toAddr.slice(atIdx + 1);
            try {
              domain = !options.iri ? punycode.toASCII(unescapeComponent(domain, options).toLowerCase()) : punycode.toUnicode(domain);
            } catch (e) {
              components.error = components.error || "Email address's domain name can not be converted to " + (!options.iri ? "ASCII" : "Unicode") + " via punycode: " + e;
            }
            to[x] = localPart + "@" + domain;
          }
          components.path = to.join(",");
        }
        var headers2 = mailtoComponents.headers = mailtoComponents.headers || {};
        if (mailtoComponents.subject) headers2["subject"] = mailtoComponents.subject;
        if (mailtoComponents.body) headers2["body"] = mailtoComponents.body;
        var fields = [];
        for (var name in headers2) {
          if (headers2[name] !== O[name]) {
            fields.push(name.replace(PCT_ENCODED, decodeUnreserved).replace(PCT_ENCODED, toUpperCase).replace(NOT_HFNAME, pctEncChar) + "=" + headers2[name].replace(PCT_ENCODED, decodeUnreserved).replace(PCT_ENCODED, toUpperCase).replace(NOT_HFVALUE, pctEncChar));
          }
        }
        if (fields.length) {
          components.query = fields.join("&");
        }
        return components;
      }
    };
    var URN_PARSE = /^([^\:]+)\:(.*)/;
    var handler$5 = {
      scheme: "urn",
      parse: function parse$$1(components, options) {
        var matches = components.path && components.path.match(URN_PARSE);
        var urnComponents = components;
        if (matches) {
          var scheme = options.scheme || urnComponents.scheme || "urn";
          var nid = matches[1].toLowerCase();
          var nss = matches[2];
          var urnScheme = scheme + ":" + (options.nid || nid);
          var schemeHandler = SCHEMES[urnScheme];
          urnComponents.nid = nid;
          urnComponents.nss = nss;
          urnComponents.path = void 0;
          if (schemeHandler) {
            urnComponents = schemeHandler.parse(urnComponents, options);
          }
        } else {
          urnComponents.error = urnComponents.error || "URN can not be parsed.";
        }
        return urnComponents;
      },
      serialize: function serialize$$1(urnComponents, options) {
        var scheme = options.scheme || urnComponents.scheme || "urn";
        var nid = urnComponents.nid;
        var urnScheme = scheme + ":" + (options.nid || nid);
        var schemeHandler = SCHEMES[urnScheme];
        if (schemeHandler) {
          urnComponents = schemeHandler.serialize(urnComponents, options);
        }
        var uriComponents = urnComponents;
        var nss = urnComponents.nss;
        uriComponents.path = (nid || options.nid) + ":" + nss;
        return uriComponents;
      }
    };
    var UUID = /^[0-9A-Fa-f]{8}(?:\-[0-9A-Fa-f]{4}){3}\-[0-9A-Fa-f]{12}$/;
    var handler$6 = {
      scheme: "urn:uuid",
      parse: function parse3(urnComponents, options) {
        var uuidComponents = urnComponents;
        uuidComponents.uuid = uuidComponents.nss;
        uuidComponents.nss = void 0;
        if (!options.tolerant && (!uuidComponents.uuid || !uuidComponents.uuid.match(UUID))) {
          uuidComponents.error = uuidComponents.error || "UUID is not valid.";
        }
        return uuidComponents;
      },
      serialize: function serialize2(uuidComponents, options) {
        var urnComponents = uuidComponents;
        urnComponents.nss = (uuidComponents.uuid || "").toLowerCase();
        return urnComponents;
      }
    };
    SCHEMES[handler.scheme] = handler;
    SCHEMES[handler$1.scheme] = handler$1;
    SCHEMES[handler$2.scheme] = handler$2;
    SCHEMES[handler$3.scheme] = handler$3;
    SCHEMES[handler$4.scheme] = handler$4;
    SCHEMES[handler$5.scheme] = handler$5;
    SCHEMES[handler$6.scheme] = handler$6;
    exports2.SCHEMES = SCHEMES;
    exports2.pctEncChar = pctEncChar;
    exports2.pctDecChars = pctDecChars;
    exports2.parse = parse2;
    exports2.removeDotSegments = removeDotSegments;
    exports2.serialize = serialize;
    exports2.resolveComponents = resolveComponents;
    exports2.resolve = resolve2;
    exports2.normalize = normalize;
    exports2.equal = equal3;
    exports2.escapeComponent = escapeComponent;
    exports2.unescapeComponent = unescapeComponent;
    Object.defineProperty(exports2, "__esModule", { value: true });
  });
})(uri_all, uri_all.exports);
var uri_allExports = uri_all.exports;
var hasRequiredResolve;
function requireResolve() {
  if (hasRequiredResolve) return resolve$1;
  hasRequiredResolve = 1;
  Object.defineProperty(resolve$1, "__esModule", { value: true });
  resolve$1.getSchemaRefs = resolve$1.resolveUrl = resolve$1.normalizeId = resolve$1._getFullPath = resolve$1.getFullPath = resolve$1.inlineRef = void 0;
  const util_12 = requireUtil();
  const equal3 = fastDeepEqual;
  const traverse2 = jsonSchemaTraverseExports;
  const URI2 = uri_allExports;
  const SIMPLE_INLINED = /* @__PURE__ */ new Set([
    "type",
    "format",
    "pattern",
    "maxLength",
    "minLength",
    "maxProperties",
    "minProperties",
    "maxItems",
    "minItems",
    "maximum",
    "minimum",
    "uniqueItems",
    "multipleOf",
    "required",
    "enum",
    "const"
  ]);
  function inlineRef(schema, limit2 = true) {
    if (typeof schema == "boolean")
      return true;
    if (limit2 === true)
      return !hasRef(schema);
    if (!limit2)
      return false;
    return countKeys(schema) <= limit2;
  }
  resolve$1.inlineRef = inlineRef;
  const REF_KEYWORDS = /* @__PURE__ */ new Set([
    "$ref",
    "$recursiveRef",
    "$recursiveAnchor",
    "$dynamicRef",
    "$dynamicAnchor"
  ]);
  function hasRef(schema) {
    for (const key in schema) {
      if (REF_KEYWORDS.has(key))
        return true;
      const sch = schema[key];
      if (Array.isArray(sch) && sch.some(hasRef))
        return true;
      if (typeof sch == "object" && hasRef(sch))
        return true;
    }
    return false;
  }
  function countKeys(schema) {
    let count = 0;
    for (const key in schema) {
      if (key === "$ref")
        return Infinity;
      count++;
      if (SIMPLE_INLINED.has(key))
        continue;
      if (typeof schema[key] == "object") {
        util_12.eachItem(schema[key], (sch) => count += countKeys(sch));
      }
      if (count === Infinity)
        return Infinity;
    }
    return count;
  }
  function getFullPath(id2 = "", normalize) {
    if (normalize !== false)
      id2 = normalizeId(id2);
    const p = URI2.parse(id2);
    return _getFullPath(p);
  }
  resolve$1.getFullPath = getFullPath;
  function _getFullPath(p) {
    return URI2.serialize(p).split("#")[0] + "#";
  }
  resolve$1._getFullPath = _getFullPath;
  const TRAILING_SLASH_HASH = /#\/?$/;
  function normalizeId(id2) {
    return id2 ? id2.replace(TRAILING_SLASH_HASH, "") : "";
  }
  resolve$1.normalizeId = normalizeId;
  function resolveUrl(baseId, id2) {
    id2 = normalizeId(id2);
    return URI2.resolve(baseId, id2);
  }
  resolve$1.resolveUrl = resolveUrl;
  const ANCHOR = /^[a-z_][-a-z0-9._]*$/i;
  function getSchemaRefs(schema) {
    if (typeof schema == "boolean")
      return {};
    const schemaId = normalizeId(schema.$id);
    const baseIds = { "": schemaId };
    const pathPrefix = getFullPath(schemaId, false);
    const localRefs = {};
    const schemaRefs = /* @__PURE__ */ new Set();
    traverse2(schema, { allKeys: true }, (sch, jsonPtr, _, parentJsonPtr) => {
      if (parentJsonPtr === void 0)
        return;
      const fullPath = pathPrefix + jsonPtr;
      let baseId = baseIds[parentJsonPtr];
      if (typeof sch.$id == "string")
        baseId = addRef.call(this, sch.$id);
      addAnchor.call(this, sch.$anchor);
      addAnchor.call(this, sch.$dynamicAnchor);
      baseIds[jsonPtr] = baseId;
      function addRef(ref2) {
        ref2 = normalizeId(baseId ? URI2.resolve(baseId, ref2) : ref2);
        if (schemaRefs.has(ref2))
          throw ambiguos(ref2);
        schemaRefs.add(ref2);
        let schOrRef = this.refs[ref2];
        if (typeof schOrRef == "string")
          schOrRef = this.refs[schOrRef];
        if (typeof schOrRef == "object") {
          checkAmbiguosRef(sch, schOrRef.schema, ref2);
        } else if (ref2 !== normalizeId(fullPath)) {
          if (ref2[0] === "#") {
            checkAmbiguosRef(sch, localRefs[ref2], ref2);
            localRefs[ref2] = sch;
          } else {
            this.refs[ref2] = fullPath;
          }
        }
        return ref2;
      }
      function addAnchor(anchor) {
        if (typeof anchor == "string") {
          if (!ANCHOR.test(anchor))
            throw new Error(`invalid anchor "${anchor}"`);
          addRef.call(this, `#${anchor}`);
        }
      }
    });
    return localRefs;
    function checkAmbiguosRef(sch1, sch2, ref2) {
      if (sch2 !== void 0 && !equal3(sch1, sch2))
        throw ambiguos(ref2);
    }
    function ambiguos(ref2) {
      return new Error(`reference "${ref2}" resolves to more than one schema`);
    }
  }
  resolve$1.getSchemaRefs = getSchemaRefs;
  return resolve$1;
}
var hasRequiredValidate;
function requireValidate() {
  if (hasRequiredValidate) return validate;
  hasRequiredValidate = 1;
  Object.defineProperty(validate, "__esModule", { value: true });
  validate.checkStrictMode = validate.schemaCxtHasRules = validate.subschemaCode = validate.validateFunctionCode = void 0;
  const boolSchema_1 = boolSchema;
  const dataType_12 = requireDataType();
  const iterate_1 = requireIterate();
  const codegen_12 = codegen;
  const names_12 = names$1;
  const resolve_12 = requireResolve();
  const util_12 = requireUtil();
  function validateFunctionCode(it) {
    if (isSchemaObj(it)) {
      checkKeywords(it);
      if (schemaCxtHasRules(it)) {
        topSchemaObjCode(it);
        return;
      }
    }
    validateFunction(it, () => boolSchema_1.topBoolOrEmptySchema(it));
  }
  validate.validateFunctionCode = validateFunctionCode;
  function validateFunction({ gen, validateName, schema, schemaEnv, opts }, body) {
    if (opts.code.es5) {
      gen.func(validateName, codegen_12._`${names_12.default.data}, ${names_12.default.valCxt}`, schemaEnv.$async, () => {
        gen.code(codegen_12._`"use strict"; ${funcSourceUrl(schema, opts)}`);
        destructureValCxtES5(gen, opts);
        gen.code(body);
      });
    } else {
      gen.func(validateName, codegen_12._`${names_12.default.data}, ${destructureValCxt(opts)}`, schemaEnv.$async, () => gen.code(funcSourceUrl(schema, opts)).code(body));
    }
  }
  function destructureValCxt(opts) {
    return codegen_12._`{${names_12.default.dataPath}="", ${names_12.default.parentData}, ${names_12.default.parentDataProperty}, ${names_12.default.rootData}=${names_12.default.data}${opts.dynamicRef ? codegen_12._`, ${names_12.default.dynamicAnchors}={}` : codegen_12.nil}}={}`;
  }
  function destructureValCxtES5(gen, opts) {
    gen.if(names_12.default.valCxt, () => {
      gen.var(names_12.default.dataPath, codegen_12._`${names_12.default.valCxt}.${names_12.default.dataPath}`);
      gen.var(names_12.default.parentData, codegen_12._`${names_12.default.valCxt}.${names_12.default.parentData}`);
      gen.var(names_12.default.parentDataProperty, codegen_12._`${names_12.default.valCxt}.${names_12.default.parentDataProperty}`);
      gen.var(names_12.default.rootData, codegen_12._`${names_12.default.valCxt}.${names_12.default.rootData}`);
      if (opts.dynamicRef)
        gen.var(names_12.default.dynamicAnchors, codegen_12._`${names_12.default.valCxt}.${names_12.default.dynamicAnchors}`);
    }, () => {
      gen.var(names_12.default.dataPath, codegen_12._`""`);
      gen.var(names_12.default.parentData, codegen_12._`undefined`);
      gen.var(names_12.default.parentDataProperty, codegen_12._`undefined`);
      gen.var(names_12.default.rootData, names_12.default.data);
      if (opts.dynamicRef)
        gen.var(names_12.default.dynamicAnchors, codegen_12._`{}`);
    });
  }
  function topSchemaObjCode(it) {
    const { schema, opts, gen } = it;
    validateFunction(it, () => {
      if (opts.$comment && schema.$comment)
        commentKeyword(it);
      checkNoDefault(it);
      gen.let(names_12.default.vErrors, null);
      gen.let(names_12.default.errors, 0);
      if (opts.unevaluated)
        resetEvaluated(it);
      typeAndKeywords(it);
      returnResults(it);
    });
    return;
  }
  function resetEvaluated(it) {
    const { gen, validateName } = it;
    it.evaluated = gen.const("evaluated", codegen_12._`${validateName}.evaluated`);
    gen.if(codegen_12._`${it.evaluated}.dynamicProps`, () => gen.assign(codegen_12._`${it.evaluated}.props`, codegen_12._`undefined`));
    gen.if(codegen_12._`${it.evaluated}.dynamicItems`, () => gen.assign(codegen_12._`${it.evaluated}.items`, codegen_12._`undefined`));
  }
  function funcSourceUrl(schema, opts) {
    return typeof schema == "object" && schema.$id && (opts.code.source || opts.code.process) ? codegen_12._`/*# sourceURL=${schema.$id} */` : codegen_12.nil;
  }
  function subschemaCode(it, valid2) {
    if (isSchemaObj(it)) {
      checkKeywords(it);
      if (schemaCxtHasRules(it)) {
        subSchemaObjCode(it, valid2);
        return;
      }
    }
    boolSchema_1.boolOrEmptySchema(it, valid2);
  }
  validate.subschemaCode = subschemaCode;
  function schemaCxtHasRules({ schema, self: self2 }) {
    if (typeof schema == "boolean")
      return !schema;
    for (const key in schema)
      if (self2.RULES.all[key])
        return true;
    return false;
  }
  validate.schemaCxtHasRules = schemaCxtHasRules;
  function isSchemaObj(it) {
    return typeof it.schema != "boolean";
  }
  function subSchemaObjCode(it, valid2) {
    const { schema, gen, opts } = it;
    if (opts.$comment && schema.$comment)
      commentKeyword(it);
    updateContext(it);
    checkAsync(it);
    const errsCount = gen.const("_errs", names_12.default.errors);
    typeAndKeywords(it, errsCount);
    gen.var(valid2, codegen_12._`${errsCount} === ${names_12.default.errors}`);
  }
  function checkKeywords(it) {
    util_12.checkUnknownRules(it);
    checkRefsAndKeywords(it);
  }
  function typeAndKeywords(it, errsCount) {
    if (it.opts.jtd)
      return iterate_1.schemaKeywords(it, [], false, errsCount);
    const types = dataType_12.getSchemaTypes(it.schema);
    const checkedTypes = dataType_12.coerceAndCheckDataType(it, types);
    iterate_1.schemaKeywords(it, types, !checkedTypes, errsCount);
  }
  function checkRefsAndKeywords(it) {
    const { schema, errSchemaPath, opts, self: self2 } = it;
    if (schema.$ref && opts.ignoreKeywordsWithRef && util_12.schemaHasRulesButRef(schema, self2.RULES)) {
      self2.logger.warn(`$ref: keywords ignored in schema at path "${errSchemaPath}"`);
    }
  }
  function checkNoDefault(it) {
    const { schema, opts } = it;
    if (schema.default !== void 0 && opts.useDefaults && opts.strict) {
      checkStrictMode(it, "default is ignored in the schema root");
    }
  }
  function updateContext(it) {
    if (it.schema.$id)
      it.baseId = resolve_12.resolveUrl(it.baseId, it.schema.$id);
  }
  function checkAsync(it) {
    if (it.schema.$async && !it.schemaEnv.$async)
      throw new Error("async schema in sync schema");
  }
  function commentKeyword({ gen, schemaEnv, schema, errSchemaPath, opts }) {
    const msg = schema.$comment;
    if (opts.$comment === true) {
      gen.code(codegen_12._`${names_12.default.self}.logger.log(${msg})`);
    } else if (typeof opts.$comment == "function") {
      const schemaPath = codegen_12.str`${errSchemaPath}/$comment`;
      const rootName = gen.scopeValue("root", { ref: schemaEnv.root });
      gen.code(codegen_12._`${names_12.default.self}.opts.$comment(${msg}, ${schemaPath}, ${rootName}.schema)`);
    }
  }
  function returnResults(it) {
    const { gen, schemaEnv, validateName, ValidationError, opts } = it;
    if (schemaEnv.$async) {
      gen.if(codegen_12._`${names_12.default.errors} === 0`, () => gen.return(names_12.default.data), () => gen.throw(codegen_12._`new ${ValidationError}(${names_12.default.vErrors})`));
    } else {
      gen.assign(codegen_12._`${validateName}.errors`, names_12.default.vErrors);
      if (opts.unevaluated)
        assignEvaluated(it);
      gen.return(codegen_12._`${names_12.default.errors} === 0`);
    }
  }
  function assignEvaluated({ gen, evaluated, props, items: items2 }) {
    if (props instanceof codegen_12.Name)
      gen.assign(codegen_12._`${evaluated}.props`, props);
    if (items2 instanceof codegen_12.Name)
      gen.assign(codegen_12._`${evaluated}.items`, items2);
  }
  function checkStrictMode(it, msg, mode = it.opts.strict) {
    if (!mode)
      return;
    msg = `strict mode: ${msg}`;
    if (mode === true)
      throw new Error(msg);
    it.self.logger.warn(msg);
  }
  validate.checkStrictMode = checkStrictMode;
  return validate;
}
var hasRequiredUtil;
function requireUtil() {
  if (hasRequiredUtil) return util$1;
  hasRequiredUtil = 1;
  Object.defineProperty(util$1, "__esModule", { value: true });
  util$1.func = util$1.setEvaluated = util$1.evaluatedPropsToName = util$1.mergeEvaluated = util$1.eachItem = util$1.unescapeJsonPointer = util$1.escapeJsonPointer = util$1.escapeFragment = util$1.unescapeFragment = util$1.schemaRefOrVal = util$1.schemaHasRulesButRef = util$1.schemaHasRules = util$1.checkUnknownRules = util$1.alwaysValidSchema = util$1.toHash = void 0;
  const codegen_12 = codegen;
  const validate_12 = requireValidate();
  function toHash(arr) {
    const hash = {};
    for (const item of arr)
      hash[item] = true;
    return hash;
  }
  util$1.toHash = toHash;
  function alwaysValidSchema(it, schema) {
    if (typeof schema == "boolean")
      return schema;
    if (Object.keys(schema).length === 0)
      return true;
    checkUnknownRules(it, schema);
    return !schemaHasRules(schema, it.self.RULES.all);
  }
  util$1.alwaysValidSchema = alwaysValidSchema;
  function checkUnknownRules(it, schema = it.schema) {
    const { opts, self: self2 } = it;
    if (!opts.strict)
      return;
    if (typeof schema === "boolean")
      return;
    const rules2 = self2.RULES.keywords;
    for (const key in schema) {
      if (!rules2[key])
        validate_12.checkStrictMode(it, `unknown keyword: "${key}"`);
    }
  }
  util$1.checkUnknownRules = checkUnknownRules;
  function schemaHasRules(schema, rules2) {
    if (typeof schema == "boolean")
      return !schema;
    for (const key in schema)
      if (rules2[key])
        return true;
    return false;
  }
  util$1.schemaHasRules = schemaHasRules;
  function schemaHasRulesButRef(schema, RULES) {
    if (typeof schema == "boolean")
      return !schema;
    for (const key in schema)
      if (key !== "$ref" && RULES.all[key])
        return true;
    return false;
  }
  util$1.schemaHasRulesButRef = schemaHasRulesButRef;
  function schemaRefOrVal({ topSchemaRef, schemaPath }, schema, keyword2, $data) {
    if (!$data) {
      if (typeof schema == "number" || typeof schema == "boolean")
        return schema;
      if (typeof schema == "string")
        return codegen_12._`${schema}`;
    }
    return codegen_12._`${topSchemaRef}${schemaPath}${codegen_12.getProperty(keyword2)}`;
  }
  util$1.schemaRefOrVal = schemaRefOrVal;
  function unescapeFragment(str) {
    return unescapeJsonPointer(decodeURIComponent(str));
  }
  util$1.unescapeFragment = unescapeFragment;
  function escapeFragment(str) {
    return encodeURIComponent(escapeJsonPointer(str));
  }
  util$1.escapeFragment = escapeFragment;
  function escapeJsonPointer(str) {
    if (typeof str == "number")
      return `${str}`;
    return str.replace(/~/g, "~0").replace(/\//g, "~1");
  }
  util$1.escapeJsonPointer = escapeJsonPointer;
  function unescapeJsonPointer(str) {
    return str.replace(/~1/g, "/").replace(/~0/g, "~");
  }
  util$1.unescapeJsonPointer = unescapeJsonPointer;
  function eachItem(xs, f) {
    if (Array.isArray(xs)) {
      for (const x of xs)
        f(x);
    } else {
      f(xs);
    }
  }
  util$1.eachItem = eachItem;
  function makeMergeEvaluated({ mergeNames, mergeToName, mergeValues, resultToName }) {
    return (gen, from, to, toName) => {
      const res = to === void 0 ? from : to instanceof codegen_12.Name ? (from instanceof codegen_12.Name ? mergeNames(gen, from, to) : mergeToName(gen, from, to), to) : from instanceof codegen_12.Name ? (mergeToName(gen, to, from), from) : mergeValues(from, to);
      return toName === codegen_12.Name && !(res instanceof codegen_12.Name) ? resultToName(gen, res) : res;
    };
  }
  util$1.mergeEvaluated = {
    props: makeMergeEvaluated({
      mergeNames: (gen, from, to) => gen.if(codegen_12._`${to} !== true && ${from} !== undefined`, () => {
        gen.if(codegen_12._`${from} === true`, () => gen.assign(to, true), () => gen.assign(to, codegen_12._`${to} || {}`).code(codegen_12._`Object.assign(${to}, ${from})`));
      }),
      mergeToName: (gen, from, to) => gen.if(codegen_12._`${to} !== true`, () => {
        if (from === true) {
          gen.assign(to, true);
        } else {
          gen.assign(to, codegen_12._`${to} || {}`);
          setEvaluated(gen, to, from);
        }
      }),
      mergeValues: (from, to) => from === true ? true : { ...from, ...to },
      resultToName: evaluatedPropsToName
    }),
    items: makeMergeEvaluated({
      mergeNames: (gen, from, to) => gen.if(codegen_12._`${to} !== true && ${from} !== undefined`, () => gen.assign(to, codegen_12._`${from} === true ? true : ${to} > ${from} ? ${to} : ${from}`)),
      mergeToName: (gen, from, to) => gen.if(codegen_12._`${to} !== true`, () => gen.assign(to, from === true ? true : codegen_12._`${to} > ${from} ? ${to} : ${from}`)),
      mergeValues: (from, to) => from === true ? true : Math.max(from, to),
      resultToName: (gen, items2) => gen.var("items", items2)
    })
  };
  function evaluatedPropsToName(gen, ps) {
    if (ps === true)
      return gen.var("props", true);
    const props = gen.var("props", codegen_12._`{}`);
    if (ps !== void 0)
      setEvaluated(gen, props, ps);
    return props;
  }
  util$1.evaluatedPropsToName = evaluatedPropsToName;
  function setEvaluated(gen, props, ps) {
    Object.keys(ps).forEach((p) => gen.assign(codegen_12._`${props}${codegen_12.getProperty(p)}`, true));
  }
  util$1.setEvaluated = setEvaluated;
  function func(gen, f) {
    return gen.scopeValue("func", {
      ref: f,
      code: f.code
    });
  }
  util$1.func = func;
  return util$1;
}
var hasRequiredDataType;
function requireDataType() {
  if (hasRequiredDataType) return dataType;
  hasRequiredDataType = 1;
  (function(exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.reportTypeError = exports.checkDataTypes = exports.checkDataType = exports.coerceAndCheckDataType = exports.getJSONTypes = exports.getSchemaTypes = exports.DataType = void 0;
    const rules_1 = rules;
    const applicability_1 = applicability;
    const errors_12 = errors$1;
    const codegen_12 = codegen;
    const util_12 = requireUtil();
    var DataType;
    (function(DataType2) {
      DataType2[DataType2["Correct"] = 0] = "Correct";
      DataType2[DataType2["Wrong"] = 1] = "Wrong";
    })(DataType = exports.DataType || (exports.DataType = {}));
    function getSchemaTypes(schema) {
      const types = getJSONTypes(schema.type);
      const hasNull = types.includes("null");
      if (hasNull) {
        if (schema.nullable === false)
          throw new Error("type: null contradicts nullable: false");
      } else {
        if (!types.length && schema.nullable !== void 0) {
          throw new Error('"nullable" cannot be used without "type"');
        }
        if (schema.nullable === true)
          types.push("null");
      }
      return types;
    }
    exports.getSchemaTypes = getSchemaTypes;
    function getJSONTypes(ts) {
      const types = Array.isArray(ts) ? ts : ts ? [ts] : [];
      if (types.every(rules_1.isJSONType))
        return types;
      throw new Error("type must be JSONType or JSONType[]: " + types.join(","));
    }
    exports.getJSONTypes = getJSONTypes;
    function coerceAndCheckDataType(it, types) {
      const { gen, data, opts } = it;
      const coerceTo = coerceToTypes(types, opts.coerceTypes);
      const checkTypes = types.length > 0 && !(coerceTo.length === 0 && types.length === 1 && applicability_1.schemaHasRulesForType(it, types[0]));
      if (checkTypes) {
        const wrongType = checkDataTypes(types, data, opts.strict, DataType.Wrong);
        gen.if(wrongType, () => {
          if (coerceTo.length)
            coerceData(it, types, coerceTo);
          else
            reportTypeError(it);
        });
      }
      return checkTypes;
    }
    exports.coerceAndCheckDataType = coerceAndCheckDataType;
    const COERCIBLE = /* @__PURE__ */ new Set(["string", "number", "integer", "boolean", "null"]);
    function coerceToTypes(types, coerceTypes) {
      return coerceTypes ? types.filter((t2) => COERCIBLE.has(t2) || coerceTypes === "array" && t2 === "array") : [];
    }
    function coerceData(it, types, coerceTo) {
      const { gen, data, opts } = it;
      const dataType2 = gen.let("dataType", codegen_12._`typeof ${data}`);
      const coerced = gen.let("coerced", codegen_12._`undefined`);
      if (opts.coerceTypes === "array") {
        gen.if(codegen_12._`${dataType2} == 'object' && Array.isArray(${data}) && ${data}.length == 1`, () => gen.assign(data, codegen_12._`${data}[0]`).assign(dataType2, codegen_12._`typeof ${data}`).if(checkDataTypes(types, data, opts.strict), () => gen.assign(coerced, data)));
      }
      gen.if(codegen_12._`${coerced} !== undefined`);
      for (const t2 of coerceTo) {
        if (COERCIBLE.has(t2) || t2 === "array" && opts.coerceTypes === "array") {
          coerceSpecificType(t2);
        }
      }
      gen.else();
      reportTypeError(it);
      gen.endIf();
      gen.if(codegen_12._`${coerced} !== undefined`, () => {
        gen.assign(data, coerced);
        assignParentData(it, coerced);
      });
      function coerceSpecificType(t2) {
        switch (t2) {
          case "string":
            gen.elseIf(codegen_12._`${dataType2} == "number" || ${dataType2} == "boolean"`).assign(coerced, codegen_12._`"" + ${data}`).elseIf(codegen_12._`${data} === null`).assign(coerced, codegen_12._`""`);
            return;
          case "number":
            gen.elseIf(codegen_12._`${dataType2} == "boolean" || ${data} === null
              || (${dataType2} == "string" && ${data} && ${data} == +${data})`).assign(coerced, codegen_12._`+${data}`);
            return;
          case "integer":
            gen.elseIf(codegen_12._`${dataType2} === "boolean" || ${data} === null
              || (${dataType2} === "string" && ${data} && ${data} == +${data} && !(${data} % 1))`).assign(coerced, codegen_12._`+${data}`);
            return;
          case "boolean":
            gen.elseIf(codegen_12._`${data} === "false" || ${data} === 0 || ${data} === null`).assign(coerced, false).elseIf(codegen_12._`${data} === "true" || ${data} === 1`).assign(coerced, true);
            return;
          case "null":
            gen.elseIf(codegen_12._`${data} === "" || ${data} === 0 || ${data} === false`);
            gen.assign(coerced, null);
            return;
          case "array":
            gen.elseIf(codegen_12._`${dataType2} === "string" || ${dataType2} === "number"
              || ${dataType2} === "boolean" || ${data} === null`).assign(coerced, codegen_12._`[${data}]`);
        }
      }
    }
    function assignParentData({ gen, parentData, parentDataProperty }, expr) {
      gen.if(codegen_12._`${parentData} !== undefined`, () => gen.assign(codegen_12._`${parentData}[${parentDataProperty}]`, expr));
    }
    function checkDataType(dataType2, data, strictNums, correct = DataType.Correct) {
      const EQ = correct === DataType.Correct ? codegen_12.operators.EQ : codegen_12.operators.NEQ;
      let cond;
      switch (dataType2) {
        case "null":
          return codegen_12._`${data} ${EQ} null`;
        case "array":
          cond = codegen_12._`Array.isArray(${data})`;
          break;
        case "object":
          cond = codegen_12._`${data} && typeof ${data} == "object" && !Array.isArray(${data})`;
          break;
        case "integer":
          cond = numCond(codegen_12._`!(${data} % 1) && !isNaN(${data})`);
          break;
        case "number":
          cond = numCond();
          break;
        default:
          return codegen_12._`typeof ${data} ${EQ} ${dataType2}`;
      }
      return correct === DataType.Correct ? cond : codegen_12.not(cond);
      function numCond(_cond = codegen_12.nil) {
        return codegen_12.and(codegen_12._`typeof ${data} == "number"`, _cond, strictNums ? codegen_12._`isFinite(${data})` : codegen_12.nil);
      }
    }
    exports.checkDataType = checkDataType;
    function checkDataTypes(dataTypes, data, strictNums, correct) {
      if (dataTypes.length === 1) {
        return checkDataType(dataTypes[0], data, strictNums, correct);
      }
      let cond;
      const types = util_12.toHash(dataTypes);
      if (types.array && types.object) {
        const notObj = codegen_12._`typeof ${data} != "object"`;
        cond = types.null ? notObj : codegen_12._`!${data} || ${notObj}`;
        delete types.null;
        delete types.array;
        delete types.object;
      } else {
        cond = codegen_12.nil;
      }
      if (types.number)
        delete types.integer;
      for (const t2 in types)
        cond = codegen_12.and(cond, checkDataType(t2, data, strictNums, correct));
      return cond;
    }
    exports.checkDataTypes = checkDataTypes;
    const typeError = {
      message: ({ schema }) => codegen_12.str`should be ${schema}`,
      params: ({ schema, schemaValue }) => typeof schema == "string" ? codegen_12._`{type: ${schema}}` : codegen_12._`{type: ${schemaValue}}`
    };
    function reportTypeError(it) {
      const cxt = getTypeErrorContext(it);
      errors_12.reportError(cxt, typeError);
    }
    exports.reportTypeError = reportTypeError;
    function getTypeErrorContext(it) {
      const { gen, data, schema } = it;
      const schemaCode = util_12.schemaRefOrVal(it, schema, "type");
      return {
        gen,
        keyword: "type",
        data,
        schema: schema.type,
        schemaCode,
        schemaValue: schemaCode,
        parentSchema: schema,
        params: {},
        it
      };
    }
  })(dataType);
  return dataType;
}
var hasRequiredContext;
function requireContext() {
  if (hasRequiredContext) return context;
  hasRequiredContext = 1;
  Object.defineProperty(context, "__esModule", { value: true });
  context.getData = void 0;
  const dataType_12 = requireDataType();
  const util_12 = requireUtil();
  const errors_12 = errors$1;
  const codegen_12 = codegen;
  const names_12 = names$1;
  const subschema_12 = requireSubschema();
  class KeywordCxt {
    constructor(it, def2, keyword2) {
      validateKeywordUsage(it, def2, keyword2);
      this.gen = it.gen;
      this.allErrors = it.allErrors;
      this.keyword = keyword2;
      this.data = it.data;
      this.schema = it.schema[keyword2];
      this.$data = def2.$data && it.opts.$data && this.schema && this.schema.$data;
      this.schemaValue = util_12.schemaRefOrVal(it, this.schema, keyword2, this.$data);
      this.schemaType = def2.schemaType;
      this.parentSchema = it.schema;
      this.params = {};
      this.it = it;
      this.def = def2;
      if (this.$data) {
        this.schemaCode = it.gen.const("vSchema", getData(this.$data, it));
      } else {
        this.schemaCode = this.schemaValue;
        if (!validSchemaType(this.schema, def2.schemaType, def2.allowUndefined)) {
          throw new Error(`${keyword2} value must be ${JSON.stringify(def2.schemaType)}`);
        }
      }
      if ("code" in def2 ? def2.trackErrors : def2.errors !== false) {
        this.errsCount = it.gen.const("_errs", names_12.default.errors);
      }
    }
    result(condition, successAction, failAction) {
      this.gen.if(codegen_12.not(condition));
      if (failAction)
        failAction();
      else
        this.error();
      if (successAction) {
        this.gen.else();
        successAction();
        if (this.allErrors)
          this.gen.endIf();
      } else {
        if (this.allErrors)
          this.gen.endIf();
        else
          this.gen.else();
      }
    }
    pass(condition, failAction) {
      this.result(condition, void 0, failAction);
    }
    fail(condition) {
      if (condition === void 0) {
        this.error();
        if (!this.allErrors)
          this.gen.if(false);
        return;
      }
      this.gen.if(condition);
      this.error();
      if (this.allErrors)
        this.gen.endIf();
      else
        this.gen.else();
    }
    fail$data(condition) {
      if (!this.$data)
        return this.fail(condition);
      const { schemaCode } = this;
      this.fail(codegen_12._`${schemaCode} !== undefined && (${codegen_12.or(this.invalid$data(), condition)})`);
    }
    error(append) {
      (append ? errors_12.reportExtraError : errors_12.reportError)(this, this.def.error);
    }
    $dataError() {
      errors_12.reportError(this, this.def.$dataError || errors_12.keyword$DataError);
    }
    reset() {
      if (this.errsCount === void 0)
        throw new Error('add "trackErrors" to keyword definition');
      errors_12.resetErrorsCount(this.gen, this.errsCount);
    }
    ok(cond) {
      if (!this.allErrors)
        this.gen.if(cond);
    }
    setParams(obj, assign) {
      if (assign)
        Object.assign(this.params, obj);
      else
        this.params = obj;
    }
    block$data(valid2, codeBlock, $dataValid = codegen_12.nil) {
      this.gen.block(() => {
        this.check$data(valid2, $dataValid);
        codeBlock();
      });
    }
    check$data(valid2 = codegen_12.nil, $dataValid = codegen_12.nil) {
      if (!this.$data)
        return;
      const { gen, schemaCode, schemaType, def: def2 } = this;
      gen.if(codegen_12.or(codegen_12._`${schemaCode} === undefined`, $dataValid));
      if (valid2 !== codegen_12.nil)
        gen.assign(valid2, true);
      if (schemaType.length || def2.validateSchema) {
        gen.elseIf(this.invalid$data());
        this.$dataError();
        if (valid2 !== codegen_12.nil)
          gen.assign(valid2, false);
      }
      gen.else();
    }
    invalid$data() {
      const { gen, schemaCode, schemaType, def: def2, it } = this;
      return codegen_12.or(wrong$DataType(), invalid$DataSchema());
      function wrong$DataType() {
        if (schemaType.length) {
          if (!(schemaCode instanceof codegen_12.Name))
            throw new Error("ajv implementation error");
          const st = Array.isArray(schemaType) ? schemaType : [schemaType];
          return codegen_12._`${dataType_12.checkDataTypes(st, schemaCode, it.opts.strict, dataType_12.DataType.Wrong)}`;
        }
        return codegen_12.nil;
      }
      function invalid$DataSchema() {
        if (def2.validateSchema) {
          const validateSchemaRef = gen.scopeValue("validate$data", { ref: def2.validateSchema });
          return codegen_12._`!${validateSchemaRef}(${schemaCode})`;
        }
        return codegen_12.nil;
      }
    }
    subschema(appl, valid2) {
      return subschema_12.applySubschema(this.it, appl, valid2);
    }
    mergeEvaluated(schemaCxt, toName) {
      const { it, gen } = this;
      if (!it.opts.unevaluated)
        return;
      if (it.props !== true && schemaCxt.props !== void 0) {
        it.props = util_12.mergeEvaluated.props(gen, schemaCxt.props, it.props, toName);
      }
      if (it.items !== true && schemaCxt.items !== void 0) {
        it.items = util_12.mergeEvaluated.items(gen, schemaCxt.items, it.items, toName);
      }
    }
    mergeValidEvaluated(schemaCxt, valid2) {
      const { it, gen } = this;
      if (it.opts.unevaluated && (it.props !== true || it.items !== true)) {
        gen.if(valid2, () => this.mergeEvaluated(schemaCxt, codegen_12.Name));
        return true;
      }
    }
  }
  context.default = KeywordCxt;
  function validSchemaType(schema, schemaType, allowUndefined = false) {
    return !schemaType.length || schemaType.some((st) => st === "array" ? Array.isArray(schema) : st === "object" ? schema && typeof schema == "object" && !Array.isArray(schema) : typeof schema == st || allowUndefined && typeof schema == "undefined");
  }
  function validateKeywordUsage({ schema, opts, self: self2 }, def2, keyword2) {
    if (Array.isArray(def2.keyword) ? !def2.keyword.includes(keyword2) : def2.keyword !== keyword2) {
      throw new Error("ajv implementation error");
    }
    const deps = def2.dependencies;
    if (deps === null || deps === void 0 ? void 0 : deps.some((kwd) => !Object.prototype.hasOwnProperty.call(schema, kwd))) {
      throw new Error(`parent schema must have dependencies of ${keyword2}: ${deps.join(",")}`);
    }
    if (def2.validateSchema) {
      const valid2 = def2.validateSchema(schema[keyword2]);
      if (!valid2) {
        const msg = "keyword value is invalid: " + self2.errorsText(def2.validateSchema.errors);
        if (opts.validateSchema === "log")
          self2.logger.error(msg);
        else
          throw new Error(msg);
      }
    }
  }
  const JSON_POINTER = /^\/(?:[^~]|~0|~1)*$/;
  const RELATIVE_JSON_POINTER = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
  function getData($data, { dataLevel, dataNames, dataPathArr }) {
    let jsonPointer;
    let data;
    if ($data === "")
      return names_12.default.rootData;
    if ($data[0] === "/") {
      if (!JSON_POINTER.test($data))
        throw new Error(`Invalid JSON-pointer: ${$data}`);
      jsonPointer = $data;
      data = names_12.default.rootData;
    } else {
      const matches = RELATIVE_JSON_POINTER.exec($data);
      if (!matches)
        throw new Error(`Invalid JSON-pointer: ${$data}`);
      const up = +matches[1];
      jsonPointer = matches[2];
      if (jsonPointer === "#") {
        if (up >= dataLevel)
          throw new Error(errorMsg("property/index", up));
        return dataPathArr[dataLevel - up];
      }
      if (up > dataLevel)
        throw new Error(errorMsg("data", up));
      data = dataNames[dataLevel - up];
      if (!jsonPointer)
        return data;
    }
    let expr = data;
    const segments = jsonPointer.split("/");
    for (const segment of segments) {
      if (segment) {
        data = codegen_12._`${data}${codegen_12.getProperty(util_12.unescapeJsonPointer(segment))}`;
        expr = codegen_12._`${expr} && ${data}`;
      }
    }
    return expr;
    function errorMsg(pointerType, up) {
      return `Cannot access ${pointerType} ${up} levels up, current level is ${dataLevel}`;
    }
  }
  context.getData = getData;
  return context;
}
var core$2 = {};
var error_classes = { exports: {} };
(function(module, exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.MissingRefError = exports.ValidationError = void 0;
  const resolve_12 = requireResolve();
  class ValidationError extends Error {
    constructor(errors2) {
      super("validation failed");
      this.errors = errors2;
      this.ajv = this.validation = true;
    }
  }
  exports.ValidationError = ValidationError;
  class MissingRefError extends Error {
    constructor(baseId, ref2, msg) {
      super(msg || `can't resolve reference ${ref2} from id ${baseId}`);
      this.missingRef = resolve_12.resolveUrl(baseId, ref2);
      this.missingSchema = resolve_12.normalizeId(resolve_12.getFullPath(this.missingRef));
    }
  }
  exports.MissingRefError = MissingRefError;
  module.exports = {
    ValidationError,
    MissingRefError
  };
})(error_classes, error_classes.exports);
var error_classesExports = error_classes.exports;
var compile = {};
Object.defineProperty(compile, "__esModule", { value: true });
compile.resolveSchema = compile.getCompilingSchema = compile.resolveRef = compile.compileSchema = compile.SchemaEnv = void 0;
const codegen_1$k = codegen;
const error_classes_1$1 = error_classesExports;
const names_1$2 = names$1;
const resolve_1 = requireResolve();
const util_1$c = requireUtil();
const validate_1$7 = requireValidate();
const URI = uri_allExports;
class SchemaEnv {
  constructor(env2) {
    var _a;
    this.refs = {};
    this.dynamicAnchors = {};
    let schema;
    if (typeof env2.schema == "object")
      schema = env2.schema;
    this.schema = env2.schema;
    this.root = env2.root || this;
    this.baseId = (_a = env2.baseId) !== null && _a !== void 0 ? _a : resolve_1.normalizeId(schema === null || schema === void 0 ? void 0 : schema.$id);
    this.localRefs = env2.localRefs;
    this.meta = env2.meta;
    this.$async = schema === null || schema === void 0 ? void 0 : schema.$async;
    this.refs = {};
  }
}
compile.SchemaEnv = SchemaEnv;
function compileSchema(sch) {
  const _sch = getCompilingSchema.call(this, sch);
  if (_sch)
    return _sch;
  const rootId = resolve_1.getFullPath(sch.root.baseId);
  const { es5, lines } = this.opts.code;
  const { ownProperties } = this.opts;
  const gen = new codegen_1$k.CodeGen(this.scope, { es5, lines, ownProperties });
  let _ValidationError;
  if (sch.$async) {
    _ValidationError = gen.scopeValue("Error", {
      ref: error_classes_1$1.ValidationError,
      code: codegen_1$k._`require("ajv/dist/compile/error_classes").ValidationError`
    });
  }
  const validateName = gen.scopeName("validate");
  sch.validateName = validateName;
  const schemaCxt = {
    gen,
    allErrors: this.opts.allErrors,
    data: names_1$2.default.data,
    parentData: names_1$2.default.parentData,
    parentDataProperty: names_1$2.default.parentDataProperty,
    dataNames: [names_1$2.default.data],
    dataPathArr: [codegen_1$k.nil],
    dataLevel: 0,
    dataTypes: [],
    definedProperties: /* @__PURE__ */ new Set(),
    topSchemaRef: gen.scopeValue("schema", this.opts.code.source === true ? { ref: sch.schema, code: codegen_1$k.stringify(sch.schema) } : { ref: sch.schema }),
    validateName,
    ValidationError: _ValidationError,
    schema: sch.schema,
    schemaEnv: sch,
    rootId,
    baseId: sch.baseId || rootId,
    schemaPath: codegen_1$k.nil,
    errSchemaPath: this.opts.jtd ? "" : "#",
    errorPath: codegen_1$k._`""`,
    opts: this.opts,
    self: this
  };
  let sourceCode;
  try {
    this._compilations.add(sch);
    validate_1$7.validateFunctionCode(schemaCxt);
    gen.optimize(this.opts.code.optimize);
    const validateCode = gen.toString();
    sourceCode = `${gen.scopeRefs(names_1$2.default.scope)}return ${validateCode}`;
    if (this.opts.code.process)
      sourceCode = this.opts.code.process(sourceCode, sch);
    const makeValidate = new Function(`${names_1$2.default.self}`, `${names_1$2.default.scope}`, sourceCode);
    const validate2 = makeValidate(this, this.scope.get());
    this.scope.value(validateName, { ref: validate2 });
    validate2.errors = null;
    validate2.schema = sch.schema;
    validate2.schemaEnv = sch;
    if (sch.$async)
      validate2.$async = true;
    if (this.opts.code.source === true) {
      validate2.source = { validateName, validateCode, scopeValues: gen._values };
    }
    if (this.opts.unevaluated) {
      const { props, items: items2 } = schemaCxt;
      validate2.evaluated = {
        props: props instanceof codegen_1$k.Name ? void 0 : props,
        items: items2 instanceof codegen_1$k.Name ? void 0 : items2,
        dynamicProps: props instanceof codegen_1$k.Name,
        dynamicItems: items2 instanceof codegen_1$k.Name
      };
      if (validate2.source)
        validate2.source.evaluated = codegen_1$k.stringify(validate2.evaluated);
    }
    sch.validate = validate2;
    return sch;
  } catch (e) {
    delete sch.validate;
    delete sch.validateName;
    if (sourceCode)
      this.logger.error("Error compiling schema, function code:", sourceCode);
    throw e;
  } finally {
    this._compilations.delete(sch);
  }
}
compile.compileSchema = compileSchema;
function resolveRef(root, baseId, ref2) {
  var _a;
  ref2 = resolve_1.resolveUrl(baseId, ref2);
  const schOrFunc = root.refs[ref2];
  if (schOrFunc)
    return schOrFunc;
  let _sch = resolve.call(this, root, ref2);
  if (_sch === void 0) {
    const schema = (_a = root.localRefs) === null || _a === void 0 ? void 0 : _a[ref2];
    if (schema)
      _sch = new SchemaEnv({ schema, root, baseId });
  }
  if (_sch === void 0)
    return;
  return root.refs[ref2] = inlineOrCompile.call(this, _sch);
}
compile.resolveRef = resolveRef;
function inlineOrCompile(sch) {
  if (resolve_1.inlineRef(sch.schema, this.opts.inlineRefs))
    return sch.schema;
  return sch.validate ? sch : compileSchema.call(this, sch);
}
function getCompilingSchema(schEnv) {
  for (const sch of this._compilations) {
    if (sameSchemaEnv(sch, schEnv))
      return sch;
  }
}
compile.getCompilingSchema = getCompilingSchema;
function sameSchemaEnv(s1, s2) {
  return s1.schema === s2.schema && s1.root === s2.root && s1.baseId === s2.baseId;
}
function resolve(root, ref2) {
  let sch;
  while (typeof (sch = this.refs[ref2]) == "string")
    ref2 = sch;
  return sch || this.schemas[ref2] || resolveSchema.call(this, root, ref2);
}
function resolveSchema(root, ref2) {
  const p = URI.parse(ref2);
  const refPath = resolve_1._getFullPath(p);
  let baseId = resolve_1.getFullPath(root.baseId);
  if (Object.keys(root.schema).length > 0 && refPath === baseId) {
    return getJsonPointer.call(this, p, root);
  }
  const id2 = resolve_1.normalizeId(refPath);
  const schOrRef = this.refs[id2] || this.schemas[id2];
  if (typeof schOrRef == "string") {
    const sch = resolveSchema.call(this, root, schOrRef);
    if (typeof (sch === null || sch === void 0 ? void 0 : sch.schema) !== "object")
      return;
    return getJsonPointer.call(this, p, sch);
  }
  if (typeof (schOrRef === null || schOrRef === void 0 ? void 0 : schOrRef.schema) !== "object")
    return;
  if (!schOrRef.validate)
    compileSchema.call(this, schOrRef);
  if (id2 === resolve_1.normalizeId(ref2)) {
    const { schema } = schOrRef;
    if (schema.$id)
      baseId = resolve_1.resolveUrl(baseId, schema.$id);
    return new SchemaEnv({ schema, root, baseId });
  }
  return getJsonPointer.call(this, p, schOrRef);
}
compile.resolveSchema = resolveSchema;
const PREVENT_SCOPE_CHANGE = /* @__PURE__ */ new Set([
  "properties",
  "patternProperties",
  "enum",
  "dependencies",
  "definitions"
]);
function getJsonPointer(parsedRef, { baseId, schema, root }) {
  var _a;
  if (((_a = parsedRef.fragment) === null || _a === void 0 ? void 0 : _a[0]) !== "/")
    return;
  for (const part of parsedRef.fragment.slice(1).split("/")) {
    if (typeof schema == "boolean")
      return;
    schema = schema[util_1$c.unescapeFragment(part)];
    if (schema === void 0)
      return;
    if (!PREVENT_SCOPE_CHANGE.has(part) && typeof schema == "object" && schema.$id) {
      baseId = resolve_1.resolveUrl(baseId, schema.$id);
    }
  }
  let env2;
  if (typeof schema != "boolean" && schema.$ref && !util_1$c.schemaHasRulesButRef(schema, this.RULES)) {
    const $ref = resolve_1.resolveUrl(baseId, schema.$ref);
    env2 = resolveSchema.call(this, root, $ref);
  }
  env2 = env2 || new SchemaEnv({ schema, root, baseId });
  if (env2.schema !== env2.root.schema)
    return env2;
  return void 0;
}
const $id$1 = "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#";
const description = "Meta-schema for $data reference (JSON AnySchema extension proposal)";
const type$1 = "object";
const required$1 = [
  "$data"
];
const properties$2 = {
  $data: {
    type: "string",
    anyOf: [
      {
        format: "relative-json-pointer"
      },
      {
        format: "json-pointer"
      }
    ]
  }
};
const additionalProperties$1 = false;
const require$$8 = {
  $id: $id$1,
  description,
  type: type$1,
  required: required$1,
  properties: properties$2,
  additionalProperties: additionalProperties$1
};
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.CodeGen = exports.Name = exports.nil = exports.stringify = exports.str = exports._ = exports.KeywordCxt = void 0;
  const context_12 = requireContext();
  exports.KeywordCxt = context_12.default;
  var codegen_12 = codegen;
  Object.defineProperty(exports, "_", { enumerable: true, get: function() {
    return codegen_12._;
  } });
  Object.defineProperty(exports, "str", { enumerable: true, get: function() {
    return codegen_12.str;
  } });
  Object.defineProperty(exports, "stringify", { enumerable: true, get: function() {
    return codegen_12.stringify;
  } });
  Object.defineProperty(exports, "nil", { enumerable: true, get: function() {
    return codegen_12.nil;
  } });
  Object.defineProperty(exports, "Name", { enumerable: true, get: function() {
    return codegen_12.Name;
  } });
  Object.defineProperty(exports, "CodeGen", { enumerable: true, get: function() {
    return codegen_12.CodeGen;
  } });
  const error_classes_12 = error_classesExports;
  const rules_1 = rules;
  const compile_12 = compile;
  const codegen_2 = codegen;
  const resolve_12 = requireResolve();
  const dataType_12 = requireDataType();
  const util_12 = requireUtil();
  const $dataRefSchema = require$$8;
  const META_IGNORE_OPTIONS = ["removeAdditional", "useDefaults", "coerceTypes"];
  const EXT_SCOPE_NAMES = /* @__PURE__ */ new Set([
    "validate",
    "serialize",
    "parse",
    "wrapper",
    "root",
    "schema",
    "keyword",
    "pattern",
    "formats",
    "validate$data",
    "func",
    "obj",
    "Error"
  ]);
  const removedOptions = {
    errorDataPath: "",
    format: "`validateFormats: false` can be used instead.",
    nullable: '"nullable" keyword is supported by default.',
    jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
    extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
    missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
    processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
    sourceCode: "Use option `code: {source: true}`",
    schemaId: "JSON Schema draft-04 is not supported in Ajv v7.",
    strictDefaults: "It is default now, see option `strict`.",
    strictKeywords: "It is default now, see option `strict`.",
    strictNumbers: "It is default now, see option `strict`.",
    uniqueItems: '"uniqueItems" keyword is always validated.',
    unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
    cache: "Map is used as cache, schema object as key.",
    serialize: "Map is used as cache, schema object as key."
  };
  const deprecatedOptions = {
    ignoreKeywordsWithRef: "",
    jsPropertySyntax: "",
    unicode: '"minLength"/"maxLength" account for unicode characters by default.'
  };
  function requiredOptions(o) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    const strict = (_a = o.strict) !== null && _a !== void 0 ? _a : true;
    const strictLog = strict ? "log" : false;
    const _optz = (_b = o.code) === null || _b === void 0 ? void 0 : _b.optimize;
    const optimize = _optz === true || _optz === void 0 ? 1 : _optz || 0;
    return {
      strict,
      strictTypes: (_c = o.strictTypes) !== null && _c !== void 0 ? _c : strictLog,
      strictTuples: (_d = o.strictTuples) !== null && _d !== void 0 ? _d : strictLog,
      code: o.code ? { ...o.code, optimize } : { optimize },
      loopRequired: (_e = o.loopRequired) !== null && _e !== void 0 ? _e : Infinity,
      loopEnum: (_f = o.loopEnum) !== null && _f !== void 0 ? _f : Infinity,
      meta: (_g = o.meta) !== null && _g !== void 0 ? _g : true,
      messages: (_h = o.messages) !== null && _h !== void 0 ? _h : true,
      inlineRefs: (_j = o.inlineRefs) !== null && _j !== void 0 ? _j : true,
      addUsedSchema: (_k = o.addUsedSchema) !== null && _k !== void 0 ? _k : true,
      validateSchema: (_l = o.validateSchema) !== null && _l !== void 0 ? _l : true,
      validateFormats: (_m = o.validateFormats) !== null && _m !== void 0 ? _m : true
    };
  }
  class Ajv {
    constructor(opts = {}) {
      this.schemas = {};
      this.refs = {};
      this.formats = {};
      this._compilations = /* @__PURE__ */ new Set();
      this._loading = {};
      this._cache = /* @__PURE__ */ new Map();
      opts = this.opts = { ...opts, ...requiredOptions(opts) };
      const { es5, lines } = this.opts.code;
      this.scope = new codegen_2.ValueScope({ scope: {}, prefixes: EXT_SCOPE_NAMES, es5, lines });
      this.logger = getLogger(opts.logger);
      const formatOpt = opts.validateFormats;
      opts.validateFormats = false;
      this.RULES = rules_1.getRules();
      checkOptions.call(this, removedOptions, opts, "NOT SUPPORTED");
      checkOptions.call(this, deprecatedOptions, opts, "DEPRECATED", "warn");
      this._metaOpts = getMetaSchemaOptions.call(this);
      if (opts.formats)
        addInitialFormats.call(this);
      this._addVocabularies();
      this._addDefaultMetaSchema();
      if (opts.keywords)
        addInitialKeywords.call(this, opts.keywords);
      if (typeof opts.meta == "object")
        this.addMetaSchema(opts.meta);
      addInitialSchemas.call(this);
      opts.validateFormats = formatOpt;
    }
    _addVocabularies() {
      this.addKeyword("$async");
    }
    _addDefaultMetaSchema() {
      const { $data, meta } = this.opts;
      if (meta && $data)
        this.addMetaSchema($dataRefSchema, $dataRefSchema.$id, false);
    }
    defaultMeta() {
      const { meta } = this.opts;
      return this.opts.defaultMeta = typeof meta == "object" ? meta.$id || meta : void 0;
    }
    validate(schemaKeyRef, data) {
      let v;
      if (typeof schemaKeyRef == "string") {
        v = this.getSchema(schemaKeyRef);
        if (!v)
          throw new Error(`no schema with key or ref "${schemaKeyRef}"`);
      } else {
        v = this.compile(schemaKeyRef);
      }
      const valid2 = v(data);
      if (!("$async" in v))
        this.errors = v.errors;
      return valid2;
    }
    compile(schema, _meta) {
      const sch = this._addSchema(schema, _meta);
      return sch.validate || this._compileSchemaEnv(sch);
    }
    compileAsync(schema, meta) {
      if (typeof this.opts.loadSchema != "function") {
        throw new Error("options.loadSchema should be a function");
      }
      const { loadSchema } = this.opts;
      return runCompileAsync.call(this, schema, meta);
      async function runCompileAsync(_schema, _meta) {
        await loadMetaSchema.call(this, _schema.$schema);
        const sch = this._addSchema(_schema, _meta);
        return sch.validate || _compileAsync.call(this, sch);
      }
      async function loadMetaSchema($ref) {
        if ($ref && !this.getSchema($ref)) {
          await runCompileAsync.call(this, { $ref }, true);
        }
      }
      async function _compileAsync(sch) {
        try {
          return this._compileSchemaEnv(sch);
        } catch (e) {
          if (!(e instanceof error_classes_12.MissingRefError))
            throw e;
          checkLoaded.call(this, e);
          await loadMissingSchema.call(this, e.missingSchema);
          return _compileAsync.call(this, sch);
        }
      }
      function checkLoaded({ missingSchema: ref2, missingRef }) {
        if (this.refs[ref2]) {
          throw new Error(`AnySchema ${ref2} is loaded but ${missingRef} cannot be resolved`);
        }
      }
      async function loadMissingSchema(ref2) {
        const _schema = await _loadSchema.call(this, ref2);
        if (!this.refs[ref2])
          await loadMetaSchema.call(this, _schema.$schema);
        if (!this.refs[ref2])
          this.addSchema(_schema, ref2, meta);
      }
      async function _loadSchema(ref2) {
        const p = this._loading[ref2];
        if (p)
          return p;
        try {
          return await (this._loading[ref2] = loadSchema(ref2));
        } finally {
          delete this._loading[ref2];
        }
      }
    }
    // Adds schema to the instance
    addSchema(schema, key, _meta, _validateSchema = this.opts.validateSchema) {
      if (Array.isArray(schema)) {
        for (const sch of schema)
          this.addSchema(sch, void 0, _meta, _validateSchema);
        return this;
      }
      let id2;
      if (typeof schema === "object") {
        id2 = schema.$id;
        if (id2 !== void 0 && typeof id2 != "string")
          throw new Error("schema id must be string");
      }
      key = resolve_12.normalizeId(key || id2);
      this._checkUnique(key);
      this.schemas[key] = this._addSchema(schema, _meta, _validateSchema, true);
      return this;
    }
    // Add schema that will be used to validate other schemas
    // options in META_IGNORE_OPTIONS are alway set to false
    addMetaSchema(schema, key, _validateSchema = this.opts.validateSchema) {
      this.addSchema(schema, key, true, _validateSchema);
      return this;
    }
    //  Validate schema against its meta-schema
    validateSchema(schema, throwOrLogError) {
      if (typeof schema == "boolean")
        return true;
      let $schema2;
      $schema2 = schema.$schema;
      if ($schema2 !== void 0 && typeof $schema2 != "string") {
        throw new Error("$schema must be a string");
      }
      $schema2 = $schema2 || this.opts.defaultMeta || this.defaultMeta();
      if (!$schema2) {
        this.logger.warn("meta-schema not available");
        this.errors = null;
        return true;
      }
      const valid2 = this.validate($schema2, schema);
      if (!valid2 && throwOrLogError) {
        const message = "schema is invalid: " + this.errorsText();
        if (this.opts.validateSchema === "log")
          this.logger.error(message);
        else
          throw new Error(message);
      }
      return valid2;
    }
    // Get compiled schema by `key` or `ref`.
    // (`key` that was passed to `addSchema` or full schema reference - `schema.$id` or resolved id)
    getSchema(keyRef) {
      let sch;
      while (typeof (sch = getSchEnv.call(this, keyRef)) == "string")
        keyRef = sch;
      if (sch === void 0) {
        const root = new compile_12.SchemaEnv({ schema: {} });
        sch = compile_12.resolveSchema.call(this, root, keyRef);
        if (!sch)
          return;
        this.refs[keyRef] = sch;
      }
      return sch.validate || this._compileSchemaEnv(sch);
    }
    // Remove cached schema(s).
    // If no parameter is passed all schemas but meta-schemas are removed.
    // If RegExp is passed all schemas with key/id matching pattern but meta-schemas are removed.
    // Even if schema is referenced by other schemas it still can be removed as other schemas have local references.
    removeSchema(schemaKeyRef) {
      if (schemaKeyRef instanceof RegExp) {
        this._removeAllSchemas(this.schemas, schemaKeyRef);
        this._removeAllSchemas(this.refs, schemaKeyRef);
        return this;
      }
      switch (typeof schemaKeyRef) {
        case "undefined":
          this._removeAllSchemas(this.schemas);
          this._removeAllSchemas(this.refs);
          this._cache.clear();
          return this;
        case "string": {
          const sch = getSchEnv.call(this, schemaKeyRef);
          if (typeof sch == "object")
            this._cache.delete(sch.schema);
          delete this.schemas[schemaKeyRef];
          delete this.refs[schemaKeyRef];
          return this;
        }
        case "object": {
          const cacheKey = schemaKeyRef;
          this._cache.delete(cacheKey);
          let id2 = schemaKeyRef.$id;
          if (id2) {
            id2 = resolve_12.normalizeId(id2);
            delete this.schemas[id2];
            delete this.refs[id2];
          }
          return this;
        }
        default:
          throw new Error("ajv.removeSchema: invalid parameter");
      }
    }
    // add "vocabulary" - a collection of keywords
    addVocabulary(definitions2) {
      for (const def2 of definitions2)
        this.addKeyword(def2);
      return this;
    }
    addKeyword(kwdOrDef, def2) {
      let keyword2;
      if (typeof kwdOrDef == "string") {
        keyword2 = kwdOrDef;
        if (typeof def2 == "object") {
          this.logger.warn("these parameters are deprecated, see docs for addKeyword");
          def2.keyword = keyword2;
        }
      } else if (typeof kwdOrDef == "object" && def2 === void 0) {
        def2 = kwdOrDef;
        keyword2 = def2.keyword;
        if (Array.isArray(keyword2) && !keyword2.length) {
          throw new Error("addKeywords: keyword must be string or non-empty array");
        }
      } else {
        throw new Error("invalid addKeywords parameters");
      }
      checkKeyword.call(this, keyword2, def2);
      if (!def2) {
        util_12.eachItem(keyword2, (kwd) => addRule.call(this, kwd));
        return this;
      }
      keywordMetaschema.call(this, def2);
      const definition = {
        ...def2,
        type: dataType_12.getJSONTypes(def2.type),
        schemaType: dataType_12.getJSONTypes(def2.schemaType)
      };
      util_12.eachItem(keyword2, definition.type.length === 0 ? (k) => addRule.call(this, k, definition) : (k) => definition.type.forEach((t2) => addRule.call(this, k, definition, t2)));
      return this;
    }
    getKeyword(keyword2) {
      const rule = this.RULES.all[keyword2];
      return typeof rule == "object" ? rule.definition : !!rule;
    }
    // Remove keyword
    removeKeyword(keyword2) {
      const { RULES } = this;
      delete RULES.keywords[keyword2];
      delete RULES.all[keyword2];
      for (const group of RULES.rules) {
        const i = group.rules.findIndex((rule) => rule.keyword === keyword2);
        if (i >= 0)
          group.rules.splice(i, 1);
      }
      return this;
    }
    // Add format
    addFormat(name, format2) {
      if (typeof format2 == "string")
        format2 = new RegExp(format2);
      this.formats[name] = format2;
      return this;
    }
    errorsText(errors2 = this.errors, { separator = ", ", dataVar = "data" } = {}) {
      if (!errors2 || errors2.length === 0)
        return "No errors";
      return errors2.map((e) => `${dataVar}${e.dataPath} ${e.message}`).reduce((text, msg) => text + separator + msg);
    }
    $dataMetaSchema(metaSchema, keywordsJsonPointers) {
      const rules2 = this.RULES.all;
      metaSchema = JSON.parse(JSON.stringify(metaSchema));
      for (const jsonPointer of keywordsJsonPointers) {
        const segments = jsonPointer.split("/").slice(1);
        let keywords = metaSchema;
        for (const seg of segments)
          keywords = keywords[seg];
        for (const key in rules2) {
          const rule = rules2[key];
          if (typeof rule != "object")
            continue;
          const { $data } = rule.definition;
          const schema = keywords[key];
          if ($data && schema)
            keywords[key] = schemaOrData(schema);
        }
      }
      return metaSchema;
    }
    _removeAllSchemas(schemas, regex) {
      for (const keyRef in schemas) {
        const sch = schemas[keyRef];
        if (!regex || regex.test(keyRef)) {
          if (typeof sch == "string") {
            delete schemas[keyRef];
          } else if (sch && !sch.meta) {
            this._cache.delete(sch.schema);
            delete schemas[keyRef];
          }
        }
      }
    }
    _addSchema(schema, meta, validateSchema = this.opts.validateSchema, addSchema = this.opts.addUsedSchema) {
      if (typeof schema != "object") {
        if (this.opts.jtd)
          throw new Error("schema must be object");
        else if (typeof schema != "boolean")
          throw new Error("schema must be object or boolean");
      }
      let sch = this._cache.get(schema);
      if (sch !== void 0)
        return sch;
      const localRefs = resolve_12.getSchemaRefs.call(this, schema);
      sch = new compile_12.SchemaEnv({ schema, meta, localRefs });
      this._cache.set(sch.schema, sch);
      const id2 = sch.baseId;
      if (addSchema && !id2.startsWith("#")) {
        if (id2)
          this._checkUnique(id2);
        this.refs[id2] = sch;
      }
      if (validateSchema)
        this.validateSchema(schema, true);
      return sch;
    }
    _checkUnique(id2) {
      if (this.schemas[id2] || this.refs[id2]) {
        throw new Error(`schema with key or id "${id2}" already exists`);
      }
    }
    _compileSchemaEnv(sch) {
      if (sch.meta)
        this._compileMetaSchema(sch);
      else
        compile_12.compileSchema.call(this, sch);
      if (!sch.validate)
        throw new Error("ajv implementation error");
      return sch.validate;
    }
    _compileMetaSchema(sch) {
      const currentOpts = this.opts;
      this.opts = this._metaOpts;
      try {
        compile_12.compileSchema.call(this, sch);
      } finally {
        this.opts = currentOpts;
      }
    }
  }
  exports.default = Ajv;
  Ajv.ValidationError = error_classes_12.ValidationError;
  Ajv.MissingRefError = error_classes_12.MissingRefError;
  function checkOptions(checkOpts, options, msg, log = "error") {
    for (const key in checkOpts) {
      const opt = key;
      if (opt in options)
        this.logger[log](`${msg}: option ${key}. ${checkOpts[opt]}`);
    }
  }
  function getSchEnv(keyRef) {
    keyRef = resolve_12.normalizeId(keyRef);
    return this.schemas[keyRef] || this.refs[keyRef];
  }
  function addInitialSchemas() {
    const optsSchemas = this.opts.schemas;
    if (!optsSchemas)
      return;
    if (Array.isArray(optsSchemas))
      this.addSchema(optsSchemas);
    else
      for (const key in optsSchemas)
        this.addSchema(optsSchemas[key], key);
  }
  function addInitialFormats() {
    for (const name in this.opts.formats) {
      const format2 = this.opts.formats[name];
      if (format2)
        this.addFormat(name, format2);
    }
  }
  function addInitialKeywords(defs) {
    if (Array.isArray(defs)) {
      this.addVocabulary(defs);
      return;
    }
    this.logger.warn("keywords option as map is deprecated, pass array");
    for (const keyword2 in defs) {
      const def2 = defs[keyword2];
      if (!def2.keyword)
        def2.keyword = keyword2;
      this.addKeyword(def2);
    }
  }
  function getMetaSchemaOptions() {
    const metaOpts = { ...this.opts };
    for (const opt of META_IGNORE_OPTIONS)
      delete metaOpts[opt];
    return metaOpts;
  }
  const noLogs = { log() {
  }, warn() {
  }, error() {
  } };
  function getLogger(logger) {
    if (logger === false)
      return noLogs;
    if (logger === void 0)
      return console;
    if (logger.log && logger.warn && logger.error)
      return logger;
    throw new Error("logger must implement log, warn and error methods");
  }
  const KEYWORD_NAME = /^[a-z_$][a-z0-9_$:-]*$/i;
  function checkKeyword(keyword2, def2) {
    const { RULES } = this;
    util_12.eachItem(keyword2, (kwd) => {
      if (RULES.keywords[kwd])
        throw new Error(`Keyword ${kwd} is already defined`);
      if (!KEYWORD_NAME.test(kwd))
        throw new Error(`Keyword ${kwd} has invalid name`);
    });
    if (!def2)
      return;
    if (def2.$data && !("code" in def2 || "validate" in def2)) {
      throw new Error('$data keyword must have "code" or "validate" function');
    }
  }
  function addRule(keyword2, definition, dataType2) {
    var _a;
    const post = definition === null || definition === void 0 ? void 0 : definition.post;
    if (dataType2 && post)
      throw new Error('keyword with "post" flag cannot have "type"');
    const { RULES } = this;
    let ruleGroup = post ? RULES.post : RULES.rules.find(({ type: t2 }) => t2 === dataType2);
    if (!ruleGroup) {
      ruleGroup = { type: dataType2, rules: [] };
      RULES.rules.push(ruleGroup);
    }
    RULES.keywords[keyword2] = true;
    if (!definition)
      return;
    const rule = {
      keyword: keyword2,
      definition: {
        ...definition,
        type: dataType_12.getJSONTypes(definition.type),
        schemaType: dataType_12.getJSONTypes(definition.schemaType)
      }
    };
    if (definition.before)
      addBeforeRule.call(this, ruleGroup, rule, definition.before);
    else
      ruleGroup.rules.push(rule);
    RULES.all[keyword2] = rule;
    (_a = definition.implements) === null || _a === void 0 ? void 0 : _a.forEach((kwd) => this.addKeyword(kwd));
  }
  function addBeforeRule(ruleGroup, rule, before) {
    const i = ruleGroup.rules.findIndex((_rule) => _rule.keyword === before);
    if (i >= 0) {
      ruleGroup.rules.splice(i, 0, rule);
    } else {
      ruleGroup.rules.push(rule);
      this.logger.warn(`rule ${before} is not defined`);
    }
  }
  function keywordMetaschema(def2) {
    let { metaSchema } = def2;
    if (metaSchema === void 0)
      return;
    if (def2.$data && this.opts.$data)
      metaSchema = schemaOrData(metaSchema);
    def2.validateSchema = this.compile(metaSchema, true);
  }
  const $dataRef = {
    $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#"
  };
  function schemaOrData(schema) {
    return { anyOf: [schema, $dataRef] };
  }
})(core$2);
var draft7 = {};
var core$1 = {};
var id = {};
Object.defineProperty(id, "__esModule", { value: true });
const def$p = {
  keyword: "id",
  code() {
    throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
  }
};
id.default = def$p;
var ref = {};
Object.defineProperty(ref, "__esModule", { value: true });
ref.callRef = ref.getValidate = void 0;
const error_classes_1 = error_classesExports;
const code_1$7 = requireCode();
const codegen_1$j = codegen;
const names_1$1 = names$1;
const compile_1 = compile;
const util_1$b = requireUtil();
const def$o = {
  keyword: "$ref",
  schemaType: "string",
  code(cxt) {
    const { gen, schema, it } = cxt;
    const { baseId, schemaEnv: env2, validateName, opts, self: self2 } = it;
    if (schema === "#" || schema === "#/")
      return callRootRef();
    const schOrEnv = compile_1.resolveRef.call(self2, env2.root, baseId, schema);
    if (schOrEnv === void 0)
      throw new error_classes_1.MissingRefError(baseId, schema);
    if (schOrEnv instanceof compile_1.SchemaEnv)
      return callValidate(schOrEnv);
    return inlineRefSchema(schOrEnv);
    function callRootRef() {
      if (env2 === env2.root)
        return callRef(cxt, validateName, env2, env2.$async);
      const rootName = gen.scopeValue("root", { ref: env2.root });
      return callRef(cxt, codegen_1$j._`${rootName}.validate`, env2.root, env2.root.$async);
    }
    function callValidate(sch) {
      const v = getValidate(cxt, sch);
      callRef(cxt, v, sch, sch.$async);
    }
    function inlineRefSchema(sch) {
      const schName = gen.scopeValue("schema", opts.code.source === true ? { ref: sch, code: codegen_1$j.stringify(sch) } : { ref: sch });
      const valid2 = gen.name("valid");
      const schCxt = cxt.subschema({
        schema: sch,
        dataTypes: [],
        schemaPath: codegen_1$j.nil,
        topSchemaRef: schName,
        errSchemaPath: schema
      }, valid2);
      cxt.mergeEvaluated(schCxt);
      cxt.ok(valid2);
    }
  }
};
function getValidate(cxt, sch) {
  const { gen } = cxt;
  return sch.validate ? gen.scopeValue("validate", { ref: sch.validate }) : codegen_1$j._`${gen.scopeValue("wrapper", { ref: sch })}.validate`;
}
ref.getValidate = getValidate;
function callRef(cxt, v, sch, $async) {
  const { gen, it } = cxt;
  const { allErrors, schemaEnv: env2, opts } = it;
  const passCxt = opts.passContext ? names_1$1.default.this : codegen_1$j.nil;
  if ($async)
    callAsyncRef();
  else
    callSyncRef();
  function callAsyncRef() {
    if (!env2.$async)
      throw new Error("async schema referenced by sync schema");
    const valid2 = gen.let("valid");
    gen.try(() => {
      gen.code(codegen_1$j._`await ${code_1$7.callValidateCode(cxt, v, passCxt)}`);
      addEvaluatedFrom(v);
      if (!allErrors)
        gen.assign(valid2, true);
    }, (e) => {
      gen.if(codegen_1$j._`!(${e} instanceof ${it.ValidationError})`, () => gen.throw(e));
      addErrorsFrom(e);
      if (!allErrors)
        gen.assign(valid2, false);
    });
    cxt.ok(valid2);
  }
  function callSyncRef() {
    cxt.result(code_1$7.callValidateCode(cxt, v, passCxt), () => addEvaluatedFrom(v), () => addErrorsFrom(v));
  }
  function addErrorsFrom(source2) {
    const errs = codegen_1$j._`${source2}.errors`;
    gen.assign(names_1$1.default.vErrors, codegen_1$j._`${names_1$1.default.vErrors} === null ? ${errs} : ${names_1$1.default.vErrors}.concat(${errs})`);
    gen.assign(names_1$1.default.errors, codegen_1$j._`${names_1$1.default.vErrors}.length`);
  }
  function addEvaluatedFrom(source2) {
    var _a;
    if (!it.opts.unevaluated)
      return;
    const schEvaluated = (_a = sch === null || sch === void 0 ? void 0 : sch.validate) === null || _a === void 0 ? void 0 : _a.evaluated;
    if (it.props !== true) {
      if (schEvaluated && !schEvaluated.dynamicProps) {
        if (schEvaluated.props !== void 0) {
          it.props = util_1$b.mergeEvaluated.props(gen, schEvaluated.props, it.props);
        }
      } else {
        const props = gen.var("props", codegen_1$j._`${source2}.evaluated.props`);
        it.props = util_1$b.mergeEvaluated.props(gen, props, it.props, codegen_1$j.Name);
      }
    }
    if (it.items !== true) {
      if (schEvaluated && !schEvaluated.dynamicItems) {
        if (schEvaluated.items !== void 0) {
          it.items = util_1$b.mergeEvaluated.items(gen, schEvaluated.items, it.items);
        }
      } else {
        const items2 = gen.var("items", codegen_1$j._`${source2}.evaluated.items`);
        it.items = util_1$b.mergeEvaluated.items(gen, items2, it.items, codegen_1$j.Name);
      }
    }
  }
}
ref.callRef = callRef;
ref.default = def$o;
Object.defineProperty(core$1, "__esModule", { value: true });
const id_1 = id;
const ref_1 = ref;
const core = [
  "$schema",
  "$id",
  "$defs",
  "$vocabulary",
  { keyword: "$comment" },
  "definitions",
  id_1.default,
  ref_1.default
];
core$1.default = core;
var validation$1 = {};
var limitNumber = {};
Object.defineProperty(limitNumber, "__esModule", { value: true });
const codegen_1$i = codegen;
const ops = codegen_1$i.operators;
const KWDs = {
  maximum: { okStr: "<=", ok: ops.LTE, fail: ops.GT },
  minimum: { okStr: ">=", ok: ops.GTE, fail: ops.LT },
  exclusiveMaximum: { okStr: "<", ok: ops.LT, fail: ops.GTE },
  exclusiveMinimum: { okStr: ">", ok: ops.GT, fail: ops.LTE }
};
const error$g = {
  message: ({ keyword: keyword2, schemaCode }) => codegen_1$i.str`should be ${KWDs[keyword2].okStr} ${schemaCode}`,
  params: ({ keyword: keyword2, schemaCode }) => codegen_1$i._`{comparison: ${KWDs[keyword2].okStr}, limit: ${schemaCode}}`
};
const def$n = {
  keyword: Object.keys(KWDs),
  type: "number",
  schemaType: "number",
  $data: true,
  error: error$g,
  code(cxt) {
    const { keyword: keyword2, data, schemaCode } = cxt;
    cxt.fail$data(codegen_1$i._`${data} ${KWDs[keyword2].fail} ${schemaCode} || isNaN(${data})`);
  }
};
limitNumber.default = def$n;
var multipleOf = {};
Object.defineProperty(multipleOf, "__esModule", { value: true });
const codegen_1$h = codegen;
const error$f = {
  message: ({ schemaCode }) => codegen_1$h.str`should be multiple of ${schemaCode}`,
  params: ({ schemaCode }) => codegen_1$h._`{multipleOf: ${schemaCode}}`
};
const def$m = {
  keyword: "multipleOf",
  type: "number",
  schemaType: "number",
  $data: true,
  error: error$f,
  code(cxt) {
    const { gen, data, schemaCode, it } = cxt;
    const prec = it.opts.multipleOfPrecision;
    const res = gen.let("res");
    const invalid = prec ? codegen_1$h._`Math.abs(Math.round(${res}) - ${res}) > 1e-${prec}` : codegen_1$h._`${res} !== parseInt(${res})`;
    cxt.fail$data(codegen_1$h._`(${schemaCode} === 0 || (${res} = ${data}/${schemaCode}, ${invalid}))`);
  }
};
multipleOf.default = def$m;
var limitLength = {};
var ucs2length$1 = {};
Object.defineProperty(ucs2length$1, "__esModule", { value: true });
function ucs2length(str) {
  const len = str.length;
  let length = 0;
  let pos = 0;
  let value;
  while (pos < len) {
    length++;
    value = str.charCodeAt(pos++);
    if (value >= 55296 && value <= 56319 && pos < len) {
      value = str.charCodeAt(pos);
      if ((value & 64512) === 56320)
        pos++;
    }
  }
  return length;
}
ucs2length$1.default = ucs2length;
Object.defineProperty(limitLength, "__esModule", { value: true });
const codegen_1$g = codegen;
const ucs2length_1 = ucs2length$1;
const error$e = {
  message({ keyword: keyword2, schemaCode }) {
    const comp = keyword2 === "maxLength" ? "more" : "fewer";
    return codegen_1$g.str`should NOT have ${comp} than ${schemaCode} characters`;
  },
  params: ({ schemaCode }) => codegen_1$g._`{limit: ${schemaCode}}`
};
const def$l = {
  keyword: ["maxLength", "minLength"],
  type: "string",
  schemaType: "number",
  $data: true,
  error: error$e,
  code(cxt) {
    const { keyword: keyword2, data, schemaCode, it } = cxt;
    const op = keyword2 === "maxLength" ? codegen_1$g.operators.GT : codegen_1$g.operators.LT;
    let len;
    if (it.opts.unicode === false) {
      len = codegen_1$g._`${data}.length`;
    } else {
      const u2l = cxt.gen.scopeValue("func", {
        ref: ucs2length_1.default,
        code: codegen_1$g._`require("ajv/dist/compile/ucs2length").default`
      });
      len = codegen_1$g._`${u2l}(${data})`;
    }
    cxt.fail$data(codegen_1$g._`${len} ${op} ${schemaCode}`);
  }
};
limitLength.default = def$l;
var pattern = {};
Object.defineProperty(pattern, "__esModule", { value: true });
const code_1$6 = requireCode();
const codegen_1$f = codegen;
const error$d = {
  message: ({ schemaCode }) => codegen_1$f.str`should match pattern "${schemaCode}"`,
  params: ({ schemaCode }) => codegen_1$f._`{pattern: ${schemaCode}}`
};
const def$k = {
  keyword: "pattern",
  type: "string",
  schemaType: "string",
  $data: true,
  error: error$d,
  code(cxt) {
    const { gen, data, $data, schema, schemaCode } = cxt;
    const regExp = $data ? codegen_1$f._`(new RegExp(${schemaCode}, "u"))` : code_1$6.usePattern(gen, schema);
    cxt.fail$data(codegen_1$f._`!${regExp}.test(${data})`);
  }
};
pattern.default = def$k;
var limitProperties = {};
Object.defineProperty(limitProperties, "__esModule", { value: true });
const codegen_1$e = codegen;
const error$c = {
  message({ keyword: keyword2, schemaCode }) {
    const comp = keyword2 === "maxProperties" ? "more" : "fewer";
    return codegen_1$e.str`should NOT have ${comp} than ${schemaCode} items`;
  },
  params: ({ schemaCode }) => codegen_1$e._`{limit: ${schemaCode}}`
};
const def$j = {
  keyword: ["maxProperties", "minProperties"],
  type: "object",
  schemaType: "number",
  $data: true,
  error: error$c,
  code(cxt) {
    const { keyword: keyword2, data, schemaCode } = cxt;
    const op = keyword2 === "maxProperties" ? codegen_1$e.operators.GT : codegen_1$e.operators.LT;
    cxt.fail$data(codegen_1$e._`Object.keys(${data}).length ${op} ${schemaCode}`);
  }
};
limitProperties.default = def$j;
var required = {};
Object.defineProperty(required, "__esModule", { value: true });
const code_1$5 = requireCode();
const codegen_1$d = codegen;
const validate_1$6 = requireValidate();
const error$b = {
  message: ({ params: { missingProperty } }) => codegen_1$d.str`should have required property '${missingProperty}'`,
  params: ({ params: { missingProperty } }) => codegen_1$d._`{missingProperty: ${missingProperty}}`
};
const def$i = {
  keyword: "required",
  type: "object",
  schemaType: "array",
  $data: true,
  error: error$b,
  code(cxt) {
    const { gen, schema, schemaCode, data, $data, it } = cxt;
    const { opts } = it;
    if (!$data && schema.length === 0)
      return;
    const useLoop = schema.length >= opts.loopRequired;
    if (it.allErrors)
      allErrorsMode();
    else
      exitOnErrorMode();
    if (opts.strictRequired) {
      const props = cxt.parentSchema.properties;
      const { definedProperties } = cxt.it;
      for (const requiredKey of schema) {
        if ((props === null || props === void 0 ? void 0 : props[requiredKey]) === void 0 && !definedProperties.has(requiredKey)) {
          const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
          const msg = `required property "${requiredKey}" is not defined at "${schemaPath}" (strictRequired)`;
          validate_1$6.checkStrictMode(it, msg, it.opts.strictRequired);
        }
      }
    }
    function allErrorsMode() {
      if (useLoop || $data) {
        cxt.block$data(codegen_1$d.nil, loopAllRequired);
      } else {
        for (const prop of schema) {
          code_1$5.checkReportMissingProp(cxt, prop);
        }
      }
    }
    function exitOnErrorMode() {
      const missing = gen.let("missing");
      if (useLoop || $data) {
        const valid2 = gen.let("valid", true);
        cxt.block$data(valid2, () => loopUntilMissing(missing, valid2));
        cxt.ok(valid2);
      } else {
        gen.if(code_1$5.checkMissingProp(cxt, schema, missing));
        code_1$5.reportMissingProp(cxt, missing);
        gen.else();
      }
    }
    function loopAllRequired() {
      gen.forOf("prop", schemaCode, (prop) => {
        cxt.setParams({ missingProperty: prop });
        gen.if(code_1$5.noPropertyInData(gen, data, prop, opts.ownProperties), () => cxt.error());
      });
    }
    function loopUntilMissing(missing, valid2) {
      cxt.setParams({ missingProperty: missing });
      gen.forOf(missing, schemaCode, () => {
        gen.assign(valid2, code_1$5.propertyInData(gen, data, missing, opts.ownProperties));
        gen.if(codegen_1$d.not(valid2), () => {
          cxt.error();
          gen.break();
        });
      }, codegen_1$d.nil);
    }
  }
};
required.default = def$i;
var limitItems = {};
Object.defineProperty(limitItems, "__esModule", { value: true });
const codegen_1$c = codegen;
const error$a = {
  message({ keyword: keyword2, schemaCode }) {
    const comp = keyword2 === "maxItems" ? "more" : "fewer";
    return codegen_1$c.str`should NOT have ${comp} than ${schemaCode} items`;
  },
  params: ({ schemaCode }) => codegen_1$c._`{limit: ${schemaCode}}`
};
const def$h = {
  keyword: ["maxItems", "minItems"],
  type: "array",
  schemaType: "number",
  $data: true,
  error: error$a,
  code(cxt) {
    const { keyword: keyword2, data, schemaCode } = cxt;
    const op = keyword2 === "maxItems" ? codegen_1$c.operators.GT : codegen_1$c.operators.LT;
    cxt.fail$data(codegen_1$c._`${data}.length ${op} ${schemaCode}`);
  }
};
limitItems.default = def$h;
var uniqueItems = {};
Object.defineProperty(uniqueItems, "__esModule", { value: true });
const dataType_1 = requireDataType();
const codegen_1$b = codegen;
const equal$2 = fastDeepEqual;
const error$9 = {
  message: ({ params: { i, j } }) => codegen_1$b.str`should NOT have duplicate items (items ## ${j} and ${i} are identical)`,
  params: ({ params: { i, j } }) => codegen_1$b._`{i: ${i}, j: ${j}}`
};
const def$g = {
  keyword: "uniqueItems",
  type: "array",
  schemaType: "boolean",
  $data: true,
  error: error$9,
  code(cxt) {
    const { gen, data, $data, schema, parentSchema, schemaCode, it } = cxt;
    if (!$data && !schema)
      return;
    const valid2 = gen.let("valid");
    const itemTypes = parentSchema.items ? dataType_1.getSchemaTypes(parentSchema.items) : [];
    cxt.block$data(valid2, validateUniqueItems, codegen_1$b._`${schemaCode} === false`);
    cxt.ok(valid2);
    function validateUniqueItems() {
      const i = gen.let("i", codegen_1$b._`${data}.length`);
      const j = gen.let("j");
      cxt.setParams({ i, j });
      gen.assign(valid2, true);
      gen.if(codegen_1$b._`${i} > 1`, () => (canOptimize() ? loopN : loopN2)(i, j));
    }
    function canOptimize() {
      return itemTypes.length > 0 && !itemTypes.some((t2) => t2 === "object" || t2 === "array");
    }
    function loopN(i, j) {
      const item = gen.name("item");
      const wrongType = dataType_1.checkDataTypes(itemTypes, item, it.opts.strict, dataType_1.DataType.Wrong);
      const indices = gen.const("indices", codegen_1$b._`{}`);
      gen.for(codegen_1$b._`;${i}--;`, () => {
        gen.let(item, codegen_1$b._`${data}[${i}]`);
        gen.if(wrongType, codegen_1$b._`continue`);
        if (itemTypes.length > 1)
          gen.if(codegen_1$b._`typeof ${item} == "string"`, codegen_1$b._`${item} += "_"`);
        gen.if(codegen_1$b._`typeof ${indices}[${item}] == "number"`, () => {
          gen.assign(j, codegen_1$b._`${indices}[${item}]`);
          cxt.error();
          gen.assign(valid2, false).break();
        }).code(codegen_1$b._`${indices}[${item}] = ${i}`);
      });
    }
    function loopN2(i, j) {
      const eql = cxt.gen.scopeValue("func", {
        ref: equal$2,
        code: codegen_1$b._`require("ajv/dist/compile/equal")`
      });
      const outer = gen.name("outer");
      gen.label(outer).for(codegen_1$b._`;${i}--;`, () => gen.for(codegen_1$b._`${j} = ${i}; ${j}--;`, () => gen.if(codegen_1$b._`${eql}(${data}[${i}], ${data}[${j}])`, () => {
        cxt.error();
        gen.assign(valid2, false).break(outer);
      })));
    }
  }
};
uniqueItems.default = def$g;
var _const = {};
Object.defineProperty(_const, "__esModule", { value: true });
const codegen_1$a = codegen;
const equal$1 = fastDeepEqual;
const error$8 = {
  message: "should be equal to constant",
  params: ({ schemaCode }) => codegen_1$a._`{allowedValue: ${schemaCode}}`
};
const def$f = {
  keyword: "const",
  $data: true,
  error: error$8,
  code(cxt) {
    const eql = cxt.gen.scopeValue("func", {
      ref: equal$1,
      code: codegen_1$a._`require("ajv/dist/compile/equal")`
    });
    cxt.fail$data(codegen_1$a._`!${eql}(${cxt.data}, ${cxt.schemaCode})`);
  }
};
_const.default = def$f;
var _enum = {};
Object.defineProperty(_enum, "__esModule", { value: true });
const codegen_1$9 = codegen;
const equal2 = fastDeepEqual;
const error$7 = {
  message: "should be equal to one of the allowed values",
  params: ({ schemaCode }) => codegen_1$9._`{allowedValues: ${schemaCode}}`
};
const def$e = {
  keyword: "enum",
  schemaType: "array",
  $data: true,
  error: error$7,
  code(cxt) {
    const { gen, data, $data, schema, schemaCode, it } = cxt;
    if (!$data && schema.length === 0)
      throw new Error("enum must have non-empty array");
    const useLoop = schema.length >= it.opts.loopEnum;
    const eql = cxt.gen.scopeValue("func", {
      ref: equal2,
      code: codegen_1$9._`require("ajv/dist/compile/equal")`
    });
    let valid2;
    if (useLoop || $data) {
      valid2 = gen.let("valid");
      cxt.block$data(valid2, loopEnum);
    } else {
      if (!Array.isArray(schema))
        throw new Error("ajv implementation error");
      const vSchema = gen.const("vSchema", schemaCode);
      valid2 = codegen_1$9.or(...schema.map((_x, i) => equalCode(vSchema, i)));
    }
    cxt.pass(valid2);
    function loopEnum() {
      gen.assign(valid2, false);
      gen.forOf("v", schemaCode, (v) => gen.if(codegen_1$9._`${eql}(${data}, ${v})`, () => gen.assign(valid2, true).break()));
    }
    function equalCode(vSchema, i) {
      const sch = schema[i];
      return sch && typeof sch === "object" ? codegen_1$9._`${eql}(${data}, ${vSchema}[${i}])` : codegen_1$9._`${data} === ${sch}`;
    }
  }
};
_enum.default = def$e;
Object.defineProperty(validation$1, "__esModule", { value: true });
const limitNumber_1 = limitNumber;
const multipleOf_1 = multipleOf;
const limitLength_1 = limitLength;
const pattern_1 = pattern;
const limitProperties_1 = limitProperties;
const required_1 = required;
const limitItems_1 = limitItems;
const uniqueItems_1 = uniqueItems;
const const_1 = _const;
const enum_1 = _enum;
const validation = [
  // number
  limitNumber_1.default,
  multipleOf_1.default,
  // string
  limitLength_1.default,
  pattern_1.default,
  // object
  limitProperties_1.default,
  required_1.default,
  // array
  limitItems_1.default,
  uniqueItems_1.default,
  // any
  { keyword: "type", schemaType: ["string", "array"] },
  { keyword: "nullable", schemaType: "boolean" },
  const_1.default,
  enum_1.default
];
validation$1.default = validation;
var applicator$1 = {};
var additionalItems = {};
Object.defineProperty(additionalItems, "__esModule", { value: true });
const codegen_1$8 = codegen;
const subschema_1$3 = requireSubschema();
const util_1$a = requireUtil();
const validate_1$5 = requireValidate();
const error$6 = {
  message: ({ params: { len } }) => codegen_1$8.str`should NOT have more than ${len} items`,
  params: ({ params: { len } }) => codegen_1$8._`{limit: ${len}}`
};
const def$d = {
  keyword: "additionalItems",
  type: "array",
  schemaType: ["boolean", "object"],
  before: "uniqueItems",
  error: error$6,
  code(cxt) {
    const { gen, schema, parentSchema, data, it } = cxt;
    const { items: items2 } = parentSchema;
    if (!Array.isArray(items2)) {
      validate_1$5.checkStrictMode(it, '"additionalItems" is ignored when "items" is not an array of schemas');
      return;
    }
    it.items = true;
    const len = gen.const("len", codegen_1$8._`${data}.length`);
    if (schema === false) {
      cxt.setParams({ len: items2.length });
      cxt.pass(codegen_1$8._`${len} <= ${items2.length}`);
    } else if (typeof schema == "object" && !util_1$a.alwaysValidSchema(it, schema)) {
      const valid2 = gen.var("valid", codegen_1$8._`${len} <= ${items2.length}`);
      gen.if(codegen_1$8.not(valid2), () => validateItems(valid2));
      cxt.ok(valid2);
    }
    function validateItems(valid2) {
      gen.forRange("i", items2.length, len, (i) => {
        cxt.subschema({ keyword: "additionalItems", dataProp: i, dataPropType: subschema_1$3.Type.Num }, valid2);
        if (!it.allErrors)
          gen.if(codegen_1$8.not(valid2), () => gen.break());
      });
    }
  }
};
additionalItems.default = def$d;
var items = {};
Object.defineProperty(items, "__esModule", { value: true });
const codegen_1$7 = codegen;
const util_1$9 = requireUtil();
const validate_1$4 = requireValidate();
const code_1$4 = requireCode();
const def$c = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "array", "boolean"],
  before: "uniqueItems",
  code(cxt) {
    const { gen, schema, it } = cxt;
    if (Array.isArray(schema)) {
      if (it.opts.unevaluated && schema.length && it.items !== true) {
        it.items = util_1$9.mergeEvaluated.items(gen, schema.length, it.items);
      }
      validateTuple(schema);
    } else {
      it.items = true;
      if (util_1$9.alwaysValidSchema(it, schema))
        return;
      cxt.ok(code_1$4.validateArray(cxt));
    }
    function validateTuple(schArr) {
      const { parentSchema, data } = cxt;
      if (it.opts.strictTuples && !fullTupleSchema(schArr.length, parentSchema)) {
        const msg = `"items" is ${schArr.length}-tuple, but minItems or maxItems/additionalItems are not specified or different`;
        validate_1$4.checkStrictMode(it, msg, it.opts.strictTuples);
      }
      const valid2 = gen.name("valid");
      const len = gen.const("len", codegen_1$7._`${data}.length`);
      schArr.forEach((sch, i) => {
        if (util_1$9.alwaysValidSchema(it, sch))
          return;
        gen.if(codegen_1$7._`${len} > ${i}`, () => cxt.subschema({
          keyword: "items",
          schemaProp: i,
          dataProp: i
        }, valid2));
        cxt.ok(valid2);
      });
    }
  }
};
function fullTupleSchema(len, sch) {
  return len === sch.minItems && (len === sch.maxItems || sch.additionalItems === false);
}
items.default = def$c;
var contains = {};
Object.defineProperty(contains, "__esModule", { value: true });
const codegen_1$6 = codegen;
const subschema_1$2 = requireSubschema();
const util_1$8 = requireUtil();
const validate_1$3 = requireValidate();
const error$5 = {
  message: ({ params: { min, max } }) => max === void 0 ? codegen_1$6.str`should contain at least ${min} valid item(s)` : codegen_1$6.str`should contain at least ${min} and no more than ${max} valid item(s)`,
  params: ({ params: { min, max } }) => max === void 0 ? codegen_1$6._`{minContains: ${min}}` : codegen_1$6._`{minContains: ${min}, maxContains: ${max}}`
};
const def$b = {
  keyword: "contains",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  trackErrors: true,
  error: error$5,
  code(cxt) {
    const { gen, schema, parentSchema, data, it } = cxt;
    let min;
    let max;
    const { minContains, maxContains } = parentSchema;
    if (it.opts.next) {
      min = minContains === void 0 ? 1 : minContains;
      max = maxContains;
    } else {
      min = 1;
    }
    const len = gen.const("len", codegen_1$6._`${data}.length`);
    cxt.setParams({ min, max });
    if (max === void 0 && min === 0) {
      validate_1$3.checkStrictMode(it, `"minContains" == 0 without "maxContains": "contains" keyword ignored`);
      return;
    }
    if (max !== void 0 && min > max) {
      validate_1$3.checkStrictMode(it, `"minContains" > "maxContains" is always invalid`);
      cxt.fail();
      return;
    }
    if (util_1$8.alwaysValidSchema(it, schema)) {
      let cond = codegen_1$6._`${len} >= ${min}`;
      if (max !== void 0)
        cond = codegen_1$6._`${cond} && ${len} <= ${max}`;
      cxt.pass(cond);
      return;
    }
    it.items = true;
    const valid2 = gen.name("valid");
    if (max === void 0 && min === 1) {
      validateItems(valid2, () => gen.if(valid2, () => gen.break()));
    } else {
      gen.let(valid2, false);
      const schValid = gen.name("_valid");
      const count = gen.let("count", 0);
      validateItems(schValid, () => gen.if(schValid, () => checkLimits(count)));
    }
    cxt.result(valid2, () => cxt.reset());
    function validateItems(_valid, block) {
      gen.forRange("i", 0, len, (i) => {
        cxt.subschema({
          keyword: "contains",
          dataProp: i,
          dataPropType: subschema_1$2.Type.Num,
          compositeRule: true
        }, _valid);
        block();
      });
    }
    function checkLimits(count) {
      gen.code(codegen_1$6._`${count}++`);
      if (max === void 0) {
        gen.if(codegen_1$6._`${count} >= ${min}`, () => gen.assign(valid2, true).break());
      } else {
        gen.if(codegen_1$6._`${count} > ${max}`, () => gen.assign(valid2, false).break());
        if (min === 1)
          gen.assign(valid2, true);
        else
          gen.if(codegen_1$6._`${count} >= ${min}`, () => gen.assign(valid2, true));
      }
    }
  }
};
contains.default = def$b;
var dependencies = {};
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.validateSchemaDeps = exports.validatePropertyDeps = exports.error = void 0;
  const codegen_12 = codegen;
  const util_12 = requireUtil();
  const code_12 = requireCode();
  exports.error = {
    message: ({ params: { property, depsCount, deps } }) => {
      const property_ies = depsCount === 1 ? "property" : "properties";
      return codegen_12.str`should have ${property_ies} ${deps} when property ${property} is present`;
    },
    params: ({ params: { property, depsCount, deps, missingProperty } }) => codegen_12._`{property: ${property},
    missingProperty: ${missingProperty},
    depsCount: ${depsCount},
    deps: ${deps}}`
    // TODO change to reference
  };
  const def2 = {
    keyword: "dependencies",
    type: "object",
    schemaType: "object",
    error: exports.error,
    code(cxt) {
      const [propDeps, schDeps] = splitDependencies(cxt);
      validatePropertyDeps(cxt, propDeps);
      validateSchemaDeps(cxt, schDeps);
    }
  };
  function splitDependencies({ schema }) {
    const propertyDeps = {};
    const schemaDeps = {};
    for (const key in schema) {
      if (key === "__proto__")
        continue;
      const deps = Array.isArray(schema[key]) ? propertyDeps : schemaDeps;
      deps[key] = schema[key];
    }
    return [propertyDeps, schemaDeps];
  }
  function validatePropertyDeps(cxt, propertyDeps = cxt.schema) {
    const { gen, data, it } = cxt;
    if (Object.keys(propertyDeps).length === 0)
      return;
    const missing = gen.let("missing");
    for (const prop in propertyDeps) {
      const deps = propertyDeps[prop];
      if (deps.length === 0)
        continue;
      const hasProperty = code_12.propertyInData(gen, data, prop, it.opts.ownProperties);
      cxt.setParams({
        property: prop,
        depsCount: deps.length,
        deps: deps.join(", ")
      });
      if (it.allErrors) {
        gen.if(hasProperty, () => {
          for (const depProp of deps) {
            code_12.checkReportMissingProp(cxt, depProp);
          }
        });
      } else {
        gen.if(codegen_12._`${hasProperty} && (${code_12.checkMissingProp(cxt, deps, missing)})`);
        code_12.reportMissingProp(cxt, missing);
        gen.else();
      }
    }
  }
  exports.validatePropertyDeps = validatePropertyDeps;
  function validateSchemaDeps(cxt, schemaDeps = cxt.schema) {
    const { gen, data, keyword: keyword2, it } = cxt;
    const valid2 = gen.name("valid");
    for (const prop in schemaDeps) {
      if (util_12.alwaysValidSchema(it, schemaDeps[prop]))
        continue;
      gen.if(
        code_12.propertyInData(gen, data, prop, it.opts.ownProperties),
        () => {
          const schCxt = cxt.subschema({ keyword: keyword2, schemaProp: prop }, valid2);
          cxt.mergeValidEvaluated(schCxt, valid2);
        },
        () => gen.var(valid2, true)
        // TODO var
      );
      cxt.ok(valid2);
    }
  }
  exports.validateSchemaDeps = validateSchemaDeps;
  exports.default = def2;
})(dependencies);
var propertyNames = {};
Object.defineProperty(propertyNames, "__esModule", { value: true });
const codegen_1$5 = codegen;
const util_1$7 = requireUtil();
const error$4 = {
  message: ({ params }) => codegen_1$5.str`property name '${params.propertyName}' is invalid`,
  params: ({ params }) => codegen_1$5._`{propertyName: ${params.propertyName}}`
};
const def$a = {
  keyword: "propertyNames",
  type: "object",
  schemaType: ["object", "boolean"],
  error: error$4,
  code(cxt) {
    const { gen, schema, data, it } = cxt;
    if (util_1$7.alwaysValidSchema(it, schema))
      return;
    const valid2 = gen.name("valid");
    gen.forIn("key", data, (key) => {
      cxt.setParams({ propertyName: key });
      cxt.subschema({
        keyword: "propertyNames",
        data: key,
        dataTypes: ["string"],
        propertyName: key,
        compositeRule: true
      }, valid2);
      gen.if(codegen_1$5.not(valid2), () => {
        cxt.error(true);
        if (!it.allErrors)
          gen.break();
      });
    });
    cxt.ok(valid2);
  }
};
propertyNames.default = def$a;
var additionalProperties = {};
Object.defineProperty(additionalProperties, "__esModule", { value: true });
const code_1$3 = requireCode();
const codegen_1$4 = codegen;
const names_1 = names$1;
const subschema_1$1 = requireSubschema();
const util_1$6 = requireUtil();
const error$3 = {
  message: "should NOT have additional properties",
  params: ({ params }) => codegen_1$4._`{additionalProperty: ${params.additionalProperty}}`
};
const def$9 = {
  keyword: "additionalProperties",
  type: ["object"],
  schemaType: ["boolean", "object"],
  allowUndefined: true,
  trackErrors: true,
  error: error$3,
  code(cxt) {
    const { gen, schema, parentSchema, data, errsCount, it } = cxt;
    if (!errsCount)
      throw new Error("ajv implementation error");
    const { allErrors, opts } = it;
    it.props = true;
    if (opts.removeAdditional !== "all" && util_1$6.alwaysValidSchema(it, schema))
      return;
    const props = code_1$3.allSchemaProperties(parentSchema.properties);
    const patProps = code_1$3.allSchemaProperties(parentSchema.patternProperties);
    checkAdditionalProperties();
    cxt.ok(codegen_1$4._`${errsCount} === ${names_1.default.errors}`);
    function checkAdditionalProperties() {
      gen.forIn("key", data, (key) => {
        if (!props.length && !patProps.length)
          additionalPropertyCode(key);
        else
          gen.if(isAdditional(key), () => additionalPropertyCode(key));
      });
    }
    function isAdditional(key) {
      let definedProp;
      if (props.length > 8) {
        const propsSchema = util_1$6.schemaRefOrVal(it, parentSchema.properties, "properties");
        definedProp = code_1$3.isOwnProperty(gen, propsSchema, key);
      } else if (props.length) {
        definedProp = codegen_1$4.or(...props.map((p) => codegen_1$4._`${key} === ${p}`));
      } else {
        definedProp = codegen_1$4.nil;
      }
      if (patProps.length) {
        definedProp = codegen_1$4.or(definedProp, ...patProps.map((p) => codegen_1$4._`${code_1$3.usePattern(gen, p)}.test(${key})`));
      }
      return codegen_1$4.not(definedProp);
    }
    function deleteAdditional(key) {
      gen.code(codegen_1$4._`delete ${data}[${key}]`);
    }
    function additionalPropertyCode(key) {
      if (opts.removeAdditional === "all" || opts.removeAdditional && schema === false) {
        deleteAdditional(key);
        return;
      }
      if (schema === false) {
        cxt.setParams({ additionalProperty: key });
        cxt.error();
        if (!allErrors)
          gen.break();
        return;
      }
      if (typeof schema == "object" && !util_1$6.alwaysValidSchema(it, schema)) {
        const valid2 = gen.name("valid");
        if (opts.removeAdditional === "failing") {
          applyAdditionalSchema(key, valid2, false);
          gen.if(codegen_1$4.not(valid2), () => {
            cxt.reset();
            deleteAdditional(key);
          });
        } else {
          applyAdditionalSchema(key, valid2);
          if (!allErrors)
            gen.if(codegen_1$4.not(valid2), () => gen.break());
        }
      }
    }
    function applyAdditionalSchema(key, valid2, errors2) {
      const subschema2 = {
        keyword: "additionalProperties",
        dataProp: key,
        dataPropType: subschema_1$1.Type.Str
      };
      if (errors2 === false) {
        Object.assign(subschema2, {
          compositeRule: true,
          createErrors: false,
          allErrors: false
        });
      }
      cxt.subschema(subschema2, valid2);
    }
  }
};
additionalProperties.default = def$9;
var properties$1 = {};
Object.defineProperty(properties$1, "__esModule", { value: true });
const context_1 = requireContext();
const code_1$2 = requireCode();
const util_1$5 = requireUtil();
const additionalProperties_1$1 = additionalProperties;
const def$8 = {
  keyword: "properties",
  type: "object",
  schemaType: "object",
  code(cxt) {
    const { gen, schema, parentSchema, data, it } = cxt;
    if (it.opts.removeAdditional === "all" && parentSchema.additionalProperties === void 0) {
      additionalProperties_1$1.default.code(new context_1.default(it, additionalProperties_1$1.default, "additionalProperties"));
    }
    const allProps = code_1$2.allSchemaProperties(schema);
    for (const prop of allProps) {
      it.definedProperties.add(prop);
    }
    if (it.opts.unevaluated && allProps.length && it.props !== true) {
      it.props = util_1$5.mergeEvaluated.props(gen, util_1$5.toHash(allProps), it.props);
    }
    const properties2 = allProps.filter((p) => !util_1$5.alwaysValidSchema(it, schema[p]));
    if (properties2.length === 0)
      return;
    const valid2 = gen.name("valid");
    for (const prop of properties2) {
      if (hasDefault(prop)) {
        applyPropertySchema(prop);
      } else {
        gen.if(code_1$2.propertyInData(gen, data, prop, it.opts.ownProperties));
        applyPropertySchema(prop);
        if (!it.allErrors)
          gen.else().var(valid2, true);
        gen.endIf();
      }
      cxt.it.definedProperties.add(prop);
      cxt.ok(valid2);
    }
    function hasDefault(prop) {
      return it.opts.useDefaults && !it.compositeRule && schema[prop].default !== void 0;
    }
    function applyPropertySchema(prop) {
      cxt.subschema({
        keyword: "properties",
        schemaProp: prop,
        dataProp: prop
      }, valid2);
    }
  }
};
properties$1.default = def$8;
var patternProperties = {};
Object.defineProperty(patternProperties, "__esModule", { value: true });
const code_1$1 = requireCode();
const codegen_1$3 = codegen;
const subschema_1 = requireSubschema();
const validate_1$2 = requireValidate();
const util_1$4 = requireUtil();
const def$7 = {
  keyword: "patternProperties",
  type: "object",
  schemaType: "object",
  code(cxt) {
    const { gen, schema, data, parentSchema, it } = cxt;
    const { opts } = it;
    const patterns = code_1$1.schemaProperties(it, schema);
    if (patterns.length === 0)
      return;
    const checkProperties = opts.strict && !opts.allowMatchingProperties && parentSchema.properties;
    const valid2 = gen.name("valid");
    if (it.props !== true && !(it.props instanceof codegen_1$3.Name)) {
      it.props = util_1$4.evaluatedPropsToName(gen, it.props);
    }
    const { props } = it;
    validatePatternProperties();
    function validatePatternProperties() {
      for (const pat of patterns) {
        if (checkProperties)
          checkMatchingProperties(pat);
        if (it.allErrors) {
          validateProperties(pat);
        } else {
          gen.var(valid2, true);
          validateProperties(pat);
          gen.if(valid2);
        }
      }
    }
    function checkMatchingProperties(pat) {
      for (const prop in checkProperties) {
        if (new RegExp(pat).test(prop)) {
          validate_1$2.checkStrictMode(it, `property ${prop} matches pattern ${pat} (use allowMatchingProperties)`);
        }
      }
    }
    function validateProperties(pat) {
      gen.forIn("key", data, (key) => {
        gen.if(codegen_1$3._`${code_1$1.usePattern(gen, pat)}.test(${key})`, () => {
          cxt.subschema({
            keyword: "patternProperties",
            schemaProp: pat,
            dataProp: key,
            dataPropType: subschema_1.Type.Str
          }, valid2);
          if (it.opts.unevaluated && props !== true) {
            gen.assign(codegen_1$3._`${props}[${key}]`, true);
          } else if (!it.allErrors) {
            gen.if(codegen_1$3.not(valid2), () => gen.break());
          }
        });
      });
    }
  }
};
patternProperties.default = def$7;
var not = {};
Object.defineProperty(not, "__esModule", { value: true });
const util_1$3 = requireUtil();
const def$6 = {
  keyword: "not",
  schemaType: ["object", "boolean"],
  trackErrors: true,
  code(cxt) {
    const { gen, schema, it } = cxt;
    if (util_1$3.alwaysValidSchema(it, schema)) {
      cxt.fail();
      return;
    }
    const valid2 = gen.name("valid");
    cxt.subschema({
      keyword: "not",
      compositeRule: true,
      createErrors: false,
      allErrors: false
    }, valid2);
    cxt.result(valid2, () => cxt.error(), () => cxt.reset());
  },
  error: {
    message: "should NOT be valid"
  }
};
not.default = def$6;
var anyOf = {};
Object.defineProperty(anyOf, "__esModule", { value: true });
const code_1 = requireCode();
const def$5 = {
  keyword: "anyOf",
  schemaType: "array",
  trackErrors: true,
  code: code_1.validateUnion,
  error: {
    message: "should match some schema in anyOf"
  }
};
anyOf.default = def$5;
var oneOf = {};
Object.defineProperty(oneOf, "__esModule", { value: true });
const codegen_1$2 = codegen;
const util_1$2 = requireUtil();
const error$2 = {
  message: "should match exactly one schema in oneOf",
  params: ({ params }) => codegen_1$2._`{passingSchemas: ${params.passing}}`
};
const def$4 = {
  keyword: "oneOf",
  schemaType: "array",
  trackErrors: true,
  error: error$2,
  code(cxt) {
    const { gen, schema, it } = cxt;
    if (!Array.isArray(schema))
      throw new Error("ajv implementation error");
    const schArr = schema;
    const valid2 = gen.let("valid", false);
    const passing = gen.let("passing", null);
    const schValid = gen.name("_valid");
    cxt.setParams({ passing });
    gen.block(validateOneOf);
    cxt.result(valid2, () => cxt.reset(), () => cxt.error(true));
    function validateOneOf() {
      schArr.forEach((sch, i) => {
        let schCxt;
        if (util_1$2.alwaysValidSchema(it, sch)) {
          gen.var(schValid, true);
        } else {
          schCxt = cxt.subschema({
            keyword: "oneOf",
            schemaProp: i,
            compositeRule: true
          }, schValid);
        }
        if (i > 0) {
          gen.if(codegen_1$2._`${schValid} && ${valid2}`).assign(valid2, false).assign(passing, codegen_1$2._`[${passing}, ${i}]`).else();
        }
        gen.if(schValid, () => {
          gen.assign(valid2, true);
          gen.assign(passing, i);
          if (schCxt)
            cxt.mergeEvaluated(schCxt, codegen_1$2.Name);
        });
      });
    }
  }
};
oneOf.default = def$4;
var allOf = {};
Object.defineProperty(allOf, "__esModule", { value: true });
const util_1$1 = requireUtil();
const def$3 = {
  keyword: "allOf",
  schemaType: "array",
  code(cxt) {
    const { gen, schema, it } = cxt;
    if (!Array.isArray(schema))
      throw new Error("ajv implementation error");
    const valid2 = gen.name("valid");
    schema.forEach((sch, i) => {
      if (util_1$1.alwaysValidSchema(it, sch))
        return;
      const schCxt = cxt.subschema({ keyword: "allOf", schemaProp: i }, valid2);
      cxt.ok(valid2);
      cxt.mergeEvaluated(schCxt);
    });
  }
};
allOf.default = def$3;
var _if = {};
Object.defineProperty(_if, "__esModule", { value: true });
const codegen_1$1 = codegen;
const util_1 = requireUtil();
const validate_1$1 = requireValidate();
const error$1 = {
  message: ({ params }) => codegen_1$1.str`should match "${params.ifClause}" schema`,
  params: ({ params }) => codegen_1$1._`{failingKeyword: ${params.ifClause}}`
};
const def$2 = {
  keyword: "if",
  schemaType: ["object", "boolean"],
  trackErrors: true,
  error: error$1,
  code(cxt) {
    const { gen, parentSchema, it } = cxt;
    if (parentSchema.then === void 0 && parentSchema.else === void 0) {
      validate_1$1.checkStrictMode(it, '"if" without "then" and "else" is ignored');
    }
    const hasThen = hasSchema(it, "then");
    const hasElse = hasSchema(it, "else");
    if (!hasThen && !hasElse)
      return;
    const valid2 = gen.let("valid", true);
    const schValid = gen.name("_valid");
    validateIf();
    cxt.reset();
    if (hasThen && hasElse) {
      const ifClause = gen.let("ifClause");
      cxt.setParams({ ifClause });
      gen.if(schValid, validateClause("then", ifClause), validateClause("else", ifClause));
    } else if (hasThen) {
      gen.if(schValid, validateClause("then"));
    } else {
      gen.if(codegen_1$1.not(schValid), validateClause("else"));
    }
    cxt.pass(valid2, () => cxt.error(true));
    function validateIf() {
      const schCxt = cxt.subschema({
        keyword: "if",
        compositeRule: true,
        createErrors: false,
        allErrors: false
      }, schValid);
      cxt.mergeEvaluated(schCxt);
    }
    function validateClause(keyword2, ifClause) {
      return () => {
        const schCxt = cxt.subschema({ keyword: keyword2 }, schValid);
        gen.assign(valid2, schValid);
        cxt.mergeValidEvaluated(schCxt, valid2);
        if (ifClause)
          gen.assign(ifClause, codegen_1$1._`${keyword2}`);
        else
          cxt.setParams({ ifClause: keyword2 });
      };
    }
  }
};
function hasSchema(it, keyword2) {
  const schema = it.schema[keyword2];
  return schema !== void 0 && !util_1.alwaysValidSchema(it, schema);
}
_if.default = def$2;
var thenElse = {};
Object.defineProperty(thenElse, "__esModule", { value: true });
const validate_1 = requireValidate();
const def$1 = {
  keyword: ["then", "else"],
  schemaType: ["object", "boolean"],
  code({ keyword: keyword2, parentSchema, it }) {
    if (parentSchema.if === void 0)
      validate_1.checkStrictMode(it, `"${keyword2}" without "if" is ignored`);
  }
};
thenElse.default = def$1;
Object.defineProperty(applicator$1, "__esModule", { value: true });
const additionalItems_1 = additionalItems;
const items_1 = items;
const contains_1 = contains;
const dependencies_1 = dependencies;
const propertyNames_1 = propertyNames;
const additionalProperties_1 = additionalProperties;
const properties_1 = properties$1;
const patternProperties_1 = patternProperties;
const not_1 = not;
const anyOf_1 = anyOf;
const oneOf_1 = oneOf;
const allOf_1 = allOf;
const if_1 = _if;
const thenElse_1 = thenElse;
const applicator = [
  // any
  not_1.default,
  anyOf_1.default,
  oneOf_1.default,
  allOf_1.default,
  if_1.default,
  thenElse_1.default,
  // array
  additionalItems_1.default,
  items_1.default,
  contains_1.default,
  // object
  propertyNames_1.default,
  additionalProperties_1.default,
  dependencies_1.default,
  properties_1.default,
  patternProperties_1.default
];
applicator$1.default = applicator;
var format$2 = {};
var format$1 = {};
Object.defineProperty(format$1, "__esModule", { value: true });
const codegen_1 = codegen;
const error = {
  message: ({ schemaCode }) => codegen_1.str`should match format "${schemaCode}"`,
  params: ({ schemaCode }) => codegen_1._`{format: ${schemaCode}}`
};
const def = {
  keyword: "format",
  type: ["number", "string"],
  schemaType: "string",
  $data: true,
  error,
  code(cxt, ruleType) {
    const { gen, data, $data, schema, schemaCode, it } = cxt;
    const { opts, errSchemaPath, schemaEnv, self: self2 } = it;
    if (!opts.validateFormats)
      return;
    if ($data)
      validate$DataFormat();
    else
      validateFormat();
    function validate$DataFormat() {
      const fmts = gen.scopeValue("formats", {
        ref: self2.formats,
        code: opts.code.formats
      });
      const fDef = gen.const("fDef", codegen_1._`${fmts}[${schemaCode}]`);
      const fType = gen.let("fType");
      const format2 = gen.let("format");
      gen.if(codegen_1._`typeof ${fDef} == "object" && !(${fDef} instanceof RegExp)`, () => gen.assign(fType, codegen_1._`${fDef}.type || "string"`).assign(format2, codegen_1._`${fDef}.validate`), () => gen.assign(fType, codegen_1._`"string"`).assign(format2, fDef));
      cxt.fail$data(codegen_1.or(unknownFmt(), invalidFmt()));
      function unknownFmt() {
        if (opts.strict === false)
          return codegen_1.nil;
        return codegen_1._`${schemaCode} && !${format2}`;
      }
      function invalidFmt() {
        const callFormat = schemaEnv.$async ? codegen_1._`(${fDef}.async ? await ${format2}(${data}) : ${format2}(${data}))` : codegen_1._`${format2}(${data})`;
        const validData = codegen_1._`(typeof ${format2} == "function" ? ${callFormat} : ${format2}.test(${data}))`;
        return codegen_1._`${format2} && ${format2} !== true && ${fType} === ${ruleType} && !${validData}`;
      }
    }
    function validateFormat() {
      const formatDef = self2.formats[schema];
      if (!formatDef) {
        unknownFormat();
        return;
      }
      if (formatDef === true)
        return;
      const [fmtType, format2, fmtRef] = getFormat(formatDef);
      if (fmtType === ruleType)
        cxt.pass(validCondition());
      function unknownFormat() {
        if (opts.strict === false) {
          self2.logger.warn(unknownMsg());
          return;
        }
        throw new Error(unknownMsg());
        function unknownMsg() {
          return `unknown format "${schema}" ignored in schema at path "${errSchemaPath}"`;
        }
      }
      function getFormat(fmtDef) {
        const fmt = gen.scopeValue("formats", {
          key: schema,
          ref: fmtDef,
          code: opts.code.formats ? codegen_1._`${opts.code.formats}${codegen_1.getProperty(schema)}` : void 0
        });
        if (typeof fmtDef == "object" && !(fmtDef instanceof RegExp)) {
          return [fmtDef.type || "string", fmtDef.validate, codegen_1._`${fmt}.validate`];
        }
        return ["string", fmtDef, fmt];
      }
      function validCondition() {
        if (typeof formatDef == "object" && !(formatDef instanceof RegExp) && formatDef.async) {
          if (!schemaEnv.$async)
            throw new Error("async format in sync schema");
          return codegen_1._`await ${fmtRef}(${data})`;
        }
        return typeof format2 == "function" ? codegen_1._`${fmtRef}(${data})` : codegen_1._`${fmtRef}.test(${data})`;
      }
    }
  }
};
format$1.default = def;
Object.defineProperty(format$2, "__esModule", { value: true });
const format_1$1 = format$1;
const format = [format_1$1.default];
format$2.default = format;
var metadata = {};
Object.defineProperty(metadata, "__esModule", { value: true });
metadata.contentVocabulary = metadata.metadataVocabulary = void 0;
metadata.metadataVocabulary = [
  "title",
  "description",
  "default",
  "deprecated",
  "readOnly",
  "writeOnly",
  "examples"
];
metadata.contentVocabulary = [
  "contentMediaType",
  "contentEncoding",
  "contentSchema"
];
Object.defineProperty(draft7, "__esModule", { value: true });
const core_1 = core$1;
const validation_1 = validation$1;
const applicator_1 = applicator$1;
const format_1 = format$2;
const metadata_1 = metadata;
const draft7Vocabularies = [
  core_1.default,
  validation_1.default,
  applicator_1.default,
  format_1.default,
  metadata_1.metadataVocabulary,
  metadata_1.contentVocabulary
];
draft7.default = draft7Vocabularies;
const $schema = "http://json-schema.org/draft-07/schema#";
const $id = "http://json-schema.org/draft-07/schema#";
const title = "Core schema meta-schema";
const definitions = {
  schemaArray: {
    type: "array",
    minItems: 1,
    items: {
      $ref: "#"
    }
  },
  nonNegativeInteger: {
    type: "integer",
    minimum: 0
  },
  nonNegativeIntegerDefault0: {
    allOf: [
      {
        $ref: "#/definitions/nonNegativeInteger"
      },
      {
        "default": 0
      }
    ]
  },
  simpleTypes: {
    "enum": [
      "array",
      "boolean",
      "integer",
      "null",
      "number",
      "object",
      "string"
    ]
  },
  stringArray: {
    type: "array",
    items: {
      type: "string"
    },
    uniqueItems: true,
    "default": []
  }
};
const type = [
  "object",
  "boolean"
];
const properties = {
  $id: {
    type: "string",
    format: "uri-reference"
  },
  $schema: {
    type: "string",
    format: "uri"
  },
  $ref: {
    type: "string",
    format: "uri-reference"
  },
  $comment: {
    type: "string"
  },
  title: {
    type: "string"
  },
  description: {
    type: "string"
  },
  "default": true,
  readOnly: {
    type: "boolean",
    "default": false
  },
  examples: {
    type: "array",
    items: true
  },
  multipleOf: {
    type: "number",
    exclusiveMinimum: 0
  },
  maximum: {
    type: "number"
  },
  exclusiveMaximum: {
    type: "number"
  },
  minimum: {
    type: "number"
  },
  exclusiveMinimum: {
    type: "number"
  },
  maxLength: {
    $ref: "#/definitions/nonNegativeInteger"
  },
  minLength: {
    $ref: "#/definitions/nonNegativeIntegerDefault0"
  },
  pattern: {
    type: "string",
    format: "regex"
  },
  additionalItems: {
    $ref: "#"
  },
  items: {
    anyOf: [
      {
        $ref: "#"
      },
      {
        $ref: "#/definitions/schemaArray"
      }
    ],
    "default": true
  },
  maxItems: {
    $ref: "#/definitions/nonNegativeInteger"
  },
  minItems: {
    $ref: "#/definitions/nonNegativeIntegerDefault0"
  },
  uniqueItems: {
    type: "boolean",
    "default": false
  },
  contains: {
    $ref: "#"
  },
  maxProperties: {
    $ref: "#/definitions/nonNegativeInteger"
  },
  minProperties: {
    $ref: "#/definitions/nonNegativeIntegerDefault0"
  },
  required: {
    $ref: "#/definitions/stringArray"
  },
  additionalProperties: {
    $ref: "#"
  },
  definitions: {
    type: "object",
    additionalProperties: {
      $ref: "#"
    },
    "default": {}
  },
  properties: {
    type: "object",
    additionalProperties: {
      $ref: "#"
    },
    "default": {}
  },
  patternProperties: {
    type: "object",
    additionalProperties: {
      $ref: "#"
    },
    propertyNames: {
      format: "regex"
    },
    "default": {}
  },
  dependencies: {
    type: "object",
    additionalProperties: {
      anyOf: [
        {
          $ref: "#"
        },
        {
          $ref: "#/definitions/stringArray"
        }
      ]
    }
  },
  propertyNames: {
    $ref: "#"
  },
  "const": true,
  "enum": {
    type: "array",
    items: true,
    minItems: 1,
    uniqueItems: true
  },
  type: {
    anyOf: [
      {
        $ref: "#/definitions/simpleTypes"
      },
      {
        type: "array",
        items: {
          $ref: "#/definitions/simpleTypes"
        },
        minItems: 1,
        uniqueItems: true
      }
    ]
  },
  format: {
    type: "string"
  },
  contentMediaType: {
    type: "string"
  },
  contentEncoding: {
    type: "string"
  },
  "if": {
    $ref: "#"
  },
  then: {
    $ref: "#"
  },
  "else": {
    $ref: "#"
  },
  allOf: {
    $ref: "#/definitions/schemaArray"
  },
  anyOf: {
    $ref: "#/definitions/schemaArray"
  },
  oneOf: {
    $ref: "#/definitions/schemaArray"
  },
  not: {
    $ref: "#"
  }
};
const require$$4 = {
  $schema,
  $id,
  title,
  definitions,
  type,
  properties,
  "default": true
};
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.CodeGen = exports.Name = exports.nil = exports.stringify = exports.str = exports._ = exports.KeywordCxt = void 0;
  const context_12 = requireContext();
  exports.KeywordCxt = context_12.default;
  var codegen_12 = codegen;
  Object.defineProperty(exports, "_", { enumerable: true, get: function() {
    return codegen_12._;
  } });
  Object.defineProperty(exports, "str", { enumerable: true, get: function() {
    return codegen_12.str;
  } });
  Object.defineProperty(exports, "stringify", { enumerable: true, get: function() {
    return codegen_12.stringify;
  } });
  Object.defineProperty(exports, "nil", { enumerable: true, get: function() {
    return codegen_12.nil;
  } });
  Object.defineProperty(exports, "Name", { enumerable: true, get: function() {
    return codegen_12.Name;
  } });
  Object.defineProperty(exports, "CodeGen", { enumerable: true, get: function() {
    return codegen_12.CodeGen;
  } });
  const core_12 = core$2;
  const draft7_1 = draft7;
  const draft7MetaSchema = require$$4;
  const META_SUPPORT_DATA = ["/properties"];
  const META_SCHEMA_ID = "http://json-schema.org/draft-07/schema";
  class Ajv extends core_12.default {
    _addVocabularies() {
      super._addVocabularies();
      draft7_1.default.forEach((v) => this.addVocabulary(v));
    }
    _addDefaultMetaSchema() {
      super._addDefaultMetaSchema();
      if (!this.opts.meta)
        return;
      const metaSchema = this.opts.$data ? this.$dataMetaSchema(draft7MetaSchema, META_SUPPORT_DATA) : draft7MetaSchema;
      this.addMetaSchema(metaSchema, META_SCHEMA_ID, false);
      this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
    }
    defaultMeta() {
      return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : void 0);
    }
  }
  exports.default = Ajv;
})(ajv);
var dist = { exports: {} };
var formats = {};
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.formatNames = exports.fastFormats = exports.fullFormats = void 0;
  function fmtDef(validate2, compare2) {
    return { validate: validate2, compare: compare2 };
  }
  exports.fullFormats = {
    // date: http://tools.ietf.org/html/rfc3339#section-5.6
    date: fmtDef(date, compareDate),
    // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
    time: fmtDef(time, compareTime),
    "date-time": fmtDef(date_time, compareDateTime),
    // duration: https://tools.ietf.org/html/rfc3339#appendix-A
    duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
    uri,
    "uri-reference": /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
    // uri-template: https://tools.ietf.org/html/rfc6570
    "uri-template": /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
    // For the source: https://gist.github.com/dperini/729294
    // For test cases: https://mathiasbynens.be/demo/url-regex
    url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
    email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
    hostname: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
    // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
    ipv4: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
    ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
    regex,
    // uuid: http://tools.ietf.org/html/rfc4122
    uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
    // JSON-pointer: https://tools.ietf.org/html/rfc6901
    // uri fragment: https://tools.ietf.org/html/rfc3986#appendix-A
    "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
    "json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
    // relative JSON-pointer: http://tools.ietf.org/html/draft-luff-relative-json-pointer-00
    "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/
  };
  exports.fastFormats = {
    ...exports.fullFormats,
    date: fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, compareDate),
    time: fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareTime),
    "date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareDateTime),
    // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
    uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
    "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
    // email (sources from jsen validator):
    // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
    // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'wilful violation')
    email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i
  };
  exports.formatNames = Object.keys(exports.fullFormats);
  function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }
  const DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
  const DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function date(str) {
    const matches = DATE.exec(str);
    if (!matches)
      return false;
    const year = +matches[1];
    const month = +matches[2];
    const day = +matches[3];
    return month >= 1 && month <= 12 && day >= 1 && day <= (month === 2 && isLeapYear(year) ? 29 : DAYS[month]);
  }
  function compareDate(d1, d2) {
    if (!(d1 && d2))
      return void 0;
    if (d1 > d2)
      return 1;
    if (d1 < d2)
      return -1;
    return 0;
  }
  const TIME = /^(\d\d):(\d\d):(\d\d)(\.\d+)?(z|[+-]\d\d(?::?\d\d)?)?$/i;
  function time(str, withTimeZone) {
    const matches = TIME.exec(str);
    if (!matches)
      return false;
    const hour = +matches[1];
    const minute = +matches[2];
    const second = +matches[3];
    const timeZone = matches[5];
    return (hour <= 23 && minute <= 59 && second <= 59 || hour === 23 && minute === 59 && second === 60) && (!withTimeZone || timeZone !== "");
  }
  function compareTime(t1, t2) {
    if (!(t1 && t2))
      return void 0;
    const a1 = TIME.exec(t1);
    const a2 = TIME.exec(t2);
    if (!(a1 && a2))
      return void 0;
    t1 = a1[1] + a1[2] + a1[3] + (a1[4] || "");
    t2 = a2[1] + a2[2] + a2[3] + (a2[4] || "");
    if (t1 > t2)
      return 1;
    if (t1 < t2)
      return -1;
    return 0;
  }
  const DATE_TIME_SEPARATOR = /t|\s/i;
  function date_time(str) {
    const dateTime = str.split(DATE_TIME_SEPARATOR);
    return dateTime.length === 2 && date(dateTime[0]) && time(dateTime[1], true);
  }
  function compareDateTime(dt1, dt2) {
    if (!(dt1 && dt2))
      return void 0;
    const [d1, t1] = dt1.split(DATE_TIME_SEPARATOR);
    const [d2, t2] = dt2.split(DATE_TIME_SEPARATOR);
    const res = compareDate(d1, d2);
    if (res === void 0)
      return void 0;
    return res || compareTime(t1, t2);
  }
  const NOT_URI_FRAGMENT = /\/|:/;
  const URI2 = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
  function uri(str) {
    return NOT_URI_FRAGMENT.test(str) && URI2.test(str);
  }
  const Z_ANCHOR = /[^\\]\\Z/;
  function regex(str) {
    if (Z_ANCHOR.test(str))
      return false;
    try {
      new RegExp(str);
      return true;
    } catch (e) {
      return false;
    }
  }
})(formats);
var limit = {};
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.formatLimitDefinition = void 0;
  const context_12 = requireContext();
  const codegen_12 = codegen;
  const ops2 = codegen_12.operators;
  const KWDs2 = {
    formatMaximum: { okStr: "<=", ok: ops2.LTE, fail: ops2.GT },
    formatMinimum: { okStr: ">=", ok: ops2.GTE, fail: ops2.LT },
    formatExclusiveMaximum: { okStr: "<", ok: ops2.LT, fail: ops2.GTE },
    formatExclusiveMinimum: { okStr: ">", ok: ops2.GT, fail: ops2.LTE }
  };
  const error2 = {
    message: ({ keyword: keyword2, schemaCode }) => codegen_12.str`should be ${KWDs2[keyword2].okStr} ${schemaCode}`,
    params: ({ keyword: keyword2, schemaCode }) => codegen_12._`{comparison: ${KWDs2[keyword2].okStr}, limit: ${schemaCode}}`
  };
  exports.formatLimitDefinition = {
    keyword: Object.keys(KWDs2),
    type: "string",
    schemaType: "string",
    $data: true,
    error: error2,
    code(cxt) {
      const { gen, data, schemaCode, keyword: keyword2, it } = cxt;
      const { opts, self: self2 } = it;
      if (!opts.validateFormats)
        return;
      const fCxt = new context_12.default(it, self2.RULES.all.format.definition, "format");
      if (fCxt.$data)
        validate$DataFormat();
      else
        validateFormat();
      function validate$DataFormat() {
        const fmts = gen.scopeValue("formats", {
          ref: self2.formats,
          code: opts.code.formats
        });
        const fmt = gen.const("fmt", codegen_12._`${fmts}[${fCxt.schemaCode}]`);
        cxt.fail$data(codegen_12.or(codegen_12._`typeof ${fmt} != "object"`, codegen_12._`${fmt} instanceof RegExp`, codegen_12._`typeof ${fmt}.compare != "function"`, compareCode(fmt)));
      }
      function validateFormat() {
        const format2 = fCxt.schema;
        const fmtDef = self2.formats[format2];
        if (!fmtDef || fmtDef === true)
          return;
        if (typeof fmtDef != "object" || fmtDef instanceof RegExp || typeof fmtDef.compare != "function") {
          throw new Error(`"${keyword2}": format "${format2}" does not define "compare" function`);
        }
        const fmt = gen.scopeValue("formats", {
          key: format2,
          ref: fmtDef,
          code: opts.code.formats ? codegen_12._`${opts.code.formats}${codegen_12.getProperty(format2)}` : void 0
        });
        cxt.fail$data(compareCode(fmt));
      }
      function compareCode(fmt) {
        return codegen_12._`${fmt}.compare(${data}, ${schemaCode}) ${KWDs2[keyword2].fail} 0`;
      }
    },
    dependencies: ["format"]
  };
  const formatLimitPlugin = (ajv2) => {
    ajv2.addKeyword(exports.formatLimitDefinition);
    return ajv2;
  };
  exports.default = formatLimitPlugin;
})(limit);
(function(module, exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  const formats_1 = formats;
  const limit_1 = limit;
  const codegen_12 = codegen;
  const fullName = new codegen_12.Name("fullFormats");
  const fastName = new codegen_12.Name("fastFormats");
  const formatsPlugin = (ajv2, opts = { keywords: true }) => {
    if (Array.isArray(opts)) {
      addFormats(ajv2, opts, formats_1.fullFormats, fullName);
      return ajv2;
    }
    const [formats2, exportName] = opts.mode === "fast" ? [formats_1.fastFormats, fastName] : [formats_1.fullFormats, fullName];
    const list = opts.formats || formats_1.formatNames;
    addFormats(ajv2, list, formats2, exportName);
    if (opts.keywords)
      limit_1.default(ajv2);
    return ajv2;
  };
  formatsPlugin.get = (name, mode = "full") => {
    const formats2 = mode === "fast" ? formats_1.fastFormats : formats_1.fullFormats;
    const f = formats2[name];
    if (!f)
      throw new Error(`Unknown format "${name}"`);
    return f;
  };
  function addFormats(ajv2, list, fs2, exportName) {
    var _a;
    var _b;
    (_a = (_b = ajv2.opts.code).formats) !== null && _a !== void 0 ? _a : _b.formats = codegen_12._`require("ajv-formats/dist/formats").${exportName}`;
    for (const f of list)
      ajv2.addFormat(f, fs2[f]);
  }
  exports.default = formatsPlugin;
  module.exports = formatsPlugin;
  module.exports.default = formatsPlugin;
})(dist, dist.exports);
var distExports = dist.exports;
const copyProperty = (to, from, property, ignoreNonConfigurable) => {
  if (property === "length" || property === "prototype") {
    return;
  }
  if (property === "arguments" || property === "caller") {
    return;
  }
  const toDescriptor = Object.getOwnPropertyDescriptor(to, property);
  const fromDescriptor = Object.getOwnPropertyDescriptor(from, property);
  if (!canCopyProperty(toDescriptor, fromDescriptor) && ignoreNonConfigurable) {
    return;
  }
  Object.defineProperty(to, property, fromDescriptor);
};
const canCopyProperty = function(toDescriptor, fromDescriptor) {
  return toDescriptor === void 0 || toDescriptor.configurable || toDescriptor.writable === fromDescriptor.writable && toDescriptor.enumerable === fromDescriptor.enumerable && toDescriptor.configurable === fromDescriptor.configurable && (toDescriptor.writable || toDescriptor.value === fromDescriptor.value);
};
const changePrototype = (to, from) => {
  const fromPrototype = Object.getPrototypeOf(from);
  if (fromPrototype === Object.getPrototypeOf(to)) {
    return;
  }
  Object.setPrototypeOf(to, fromPrototype);
};
const wrappedToString = (withName, fromBody) => `/* Wrapped ${withName}*/
${fromBody}`;
const toStringDescriptor = Object.getOwnPropertyDescriptor(Function.prototype, "toString");
const toStringName = Object.getOwnPropertyDescriptor(Function.prototype.toString, "name");
const changeToString = (to, from, name) => {
  const withName = name === "" ? "" : `with ${name.trim()}() `;
  const newToString = wrappedToString.bind(null, withName, from.toString());
  Object.defineProperty(newToString, "name", toStringName);
  Object.defineProperty(to, "toString", { ...toStringDescriptor, value: newToString });
};
const mimicFn$4 = (to, from, { ignoreNonConfigurable = false } = {}) => {
  const { name } = to;
  for (const property of Reflect.ownKeys(from)) {
    copyProperty(to, from, property, ignoreNonConfigurable);
  }
  changePrototype(to, from);
  changeToString(to, from, name);
  return to;
};
var mimicFn_1 = mimicFn$4;
const mimicFn$3 = mimicFn_1;
var debounceFn = (inputFunction, options = {}) => {
  if (typeof inputFunction !== "function") {
    throw new TypeError(`Expected the first argument to be a function, got \`${typeof inputFunction}\``);
  }
  const {
    wait = 0,
    before = false,
    after = true
  } = options;
  if (!before && !after) {
    throw new Error("Both `before` and `after` are false, function wouldn't be called.");
  }
  let timeout;
  let result;
  const debouncedFunction = function(...arguments_) {
    const context2 = this;
    const later = () => {
      timeout = void 0;
      if (after) {
        result = inputFunction.apply(context2, arguments_);
      }
    };
    const shouldCallNow = before && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (shouldCallNow) {
      result = inputFunction.apply(context2, arguments_);
    }
    return result;
  };
  mimicFn$3(debouncedFunction, inputFunction);
  debouncedFunction.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = void 0;
    }
  };
  return debouncedFunction;
};
var re$2 = { exports: {} };
const SEMVER_SPEC_VERSION = "2.0.0";
const MAX_LENGTH$1 = 256;
const MAX_SAFE_INTEGER$1 = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
9007199254740991;
const MAX_SAFE_COMPONENT_LENGTH = 16;
const MAX_SAFE_BUILD_LENGTH = MAX_LENGTH$1 - 6;
const RELEASE_TYPES = [
  "major",
  "premajor",
  "minor",
  "preminor",
  "patch",
  "prepatch",
  "prerelease"
];
var constants$3 = {
  MAX_LENGTH: MAX_LENGTH$1,
  MAX_SAFE_COMPONENT_LENGTH,
  MAX_SAFE_BUILD_LENGTH,
  MAX_SAFE_INTEGER: MAX_SAFE_INTEGER$1,
  RELEASE_TYPES,
  SEMVER_SPEC_VERSION,
  FLAG_INCLUDE_PRERELEASE: 1,
  FLAG_LOOSE: 2
};
const debug$1 = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
};
var debug_1 = debug$1;
(function(module, exports) {
  const {
    MAX_SAFE_COMPONENT_LENGTH: MAX_SAFE_COMPONENT_LENGTH2,
    MAX_SAFE_BUILD_LENGTH: MAX_SAFE_BUILD_LENGTH2,
    MAX_LENGTH: MAX_LENGTH2
  } = constants$3;
  const debug2 = debug_1;
  exports = module.exports = {};
  const re2 = exports.re = [];
  const safeRe = exports.safeRe = [];
  const src = exports.src = [];
  const safeSrc = exports.safeSrc = [];
  const t2 = exports.t = {};
  let R = 0;
  const LETTERDASHNUMBER = "[a-zA-Z0-9-]";
  const safeRegexReplacements = [
    ["\\s", 1],
    ["\\d", MAX_LENGTH2],
    [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH2]
  ];
  const makeSafeRegex = (value) => {
    for (const [token, max] of safeRegexReplacements) {
      value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
    }
    return value;
  };
  const createToken = (name, value, isGlobal) => {
    const safe = makeSafeRegex(value);
    const index = R++;
    debug2(name, index, value);
    t2[name] = index;
    src[index] = value;
    safeSrc[index] = safe;
    re2[index] = new RegExp(value, isGlobal ? "g" : void 0);
    safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
  };
  createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
  createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
  createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
  createToken("MAINVERSION", `(${src[t2.NUMERICIDENTIFIER]})\\.(${src[t2.NUMERICIDENTIFIER]})\\.(${src[t2.NUMERICIDENTIFIER]})`);
  createToken("MAINVERSIONLOOSE", `(${src[t2.NUMERICIDENTIFIERLOOSE]})\\.(${src[t2.NUMERICIDENTIFIERLOOSE]})\\.(${src[t2.NUMERICIDENTIFIERLOOSE]})`);
  createToken("PRERELEASEIDENTIFIER", `(?:${src[t2.NONNUMERICIDENTIFIER]}|${src[t2.NUMERICIDENTIFIER]})`);
  createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t2.NONNUMERICIDENTIFIER]}|${src[t2.NUMERICIDENTIFIERLOOSE]})`);
  createToken("PRERELEASE", `(?:-(${src[t2.PRERELEASEIDENTIFIER]}(?:\\.${src[t2.PRERELEASEIDENTIFIER]})*))`);
  createToken("PRERELEASELOOSE", `(?:-?(${src[t2.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t2.PRERELEASEIDENTIFIERLOOSE]})*))`);
  createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
  createToken("BUILD", `(?:\\+(${src[t2.BUILDIDENTIFIER]}(?:\\.${src[t2.BUILDIDENTIFIER]})*))`);
  createToken("FULLPLAIN", `v?${src[t2.MAINVERSION]}${src[t2.PRERELEASE]}?${src[t2.BUILD]}?`);
  createToken("FULL", `^${src[t2.FULLPLAIN]}$`);
  createToken("LOOSEPLAIN", `[v=\\s]*${src[t2.MAINVERSIONLOOSE]}${src[t2.PRERELEASELOOSE]}?${src[t2.BUILD]}?`);
  createToken("LOOSE", `^${src[t2.LOOSEPLAIN]}$`);
  createToken("GTLT", "((?:<|>)?=?)");
  createToken("XRANGEIDENTIFIERLOOSE", `${src[t2.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
  createToken("XRANGEIDENTIFIER", `${src[t2.NUMERICIDENTIFIER]}|x|X|\\*`);
  createToken("XRANGEPLAIN", `[v=\\s]*(${src[t2.XRANGEIDENTIFIER]})(?:\\.(${src[t2.XRANGEIDENTIFIER]})(?:\\.(${src[t2.XRANGEIDENTIFIER]})(?:${src[t2.PRERELEASE]})?${src[t2.BUILD]}?)?)?`);
  createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t2.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t2.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t2.XRANGEIDENTIFIERLOOSE]})(?:${src[t2.PRERELEASELOOSE]})?${src[t2.BUILD]}?)?)?`);
  createToken("XRANGE", `^${src[t2.GTLT]}\\s*${src[t2.XRANGEPLAIN]}$`);
  createToken("XRANGELOOSE", `^${src[t2.GTLT]}\\s*${src[t2.XRANGEPLAINLOOSE]}$`);
  createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH2}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH2}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH2}}))?`);
  createToken("COERCE", `${src[t2.COERCEPLAIN]}(?:$|[^\\d])`);
  createToken("COERCEFULL", src[t2.COERCEPLAIN] + `(?:${src[t2.PRERELEASE]})?(?:${src[t2.BUILD]})?(?:$|[^\\d])`);
  createToken("COERCERTL", src[t2.COERCE], true);
  createToken("COERCERTLFULL", src[t2.COERCEFULL], true);
  createToken("LONETILDE", "(?:~>?)");
  createToken("TILDETRIM", `(\\s*)${src[t2.LONETILDE]}\\s+`, true);
  exports.tildeTrimReplace = "$1~";
  createToken("TILDE", `^${src[t2.LONETILDE]}${src[t2.XRANGEPLAIN]}$`);
  createToken("TILDELOOSE", `^${src[t2.LONETILDE]}${src[t2.XRANGEPLAINLOOSE]}$`);
  createToken("LONECARET", "(?:\\^)");
  createToken("CARETTRIM", `(\\s*)${src[t2.LONECARET]}\\s+`, true);
  exports.caretTrimReplace = "$1^";
  createToken("CARET", `^${src[t2.LONECARET]}${src[t2.XRANGEPLAIN]}$`);
  createToken("CARETLOOSE", `^${src[t2.LONECARET]}${src[t2.XRANGEPLAINLOOSE]}$`);
  createToken("COMPARATORLOOSE", `^${src[t2.GTLT]}\\s*(${src[t2.LOOSEPLAIN]})$|^$`);
  createToken("COMPARATOR", `^${src[t2.GTLT]}\\s*(${src[t2.FULLPLAIN]})$|^$`);
  createToken("COMPARATORTRIM", `(\\s*)${src[t2.GTLT]}\\s*(${src[t2.LOOSEPLAIN]}|${src[t2.XRANGEPLAIN]})`, true);
  exports.comparatorTrimReplace = "$1$2$3";
  createToken("HYPHENRANGE", `^\\s*(${src[t2.XRANGEPLAIN]})\\s+-\\s+(${src[t2.XRANGEPLAIN]})\\s*$`);
  createToken("HYPHENRANGELOOSE", `^\\s*(${src[t2.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t2.XRANGEPLAINLOOSE]})\\s*$`);
  createToken("STAR", "(<|>)?=?\\s*\\*");
  createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
  createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
})(re$2, re$2.exports);
var reExports = re$2.exports;
const looseOption = Object.freeze({ loose: true });
const emptyOpts = Object.freeze({});
const parseOptions$1 = (options) => {
  if (!options) {
    return emptyOpts;
  }
  if (typeof options !== "object") {
    return looseOption;
  }
  return options;
};
var parseOptions_1 = parseOptions$1;
const numeric = /^[0-9]+$/;
const compareIdentifiers$1 = (a, b) => {
  if (typeof a === "number" && typeof b === "number") {
    return a === b ? 0 : a < b ? -1 : 1;
  }
  const anum = numeric.test(a);
  const bnum = numeric.test(b);
  if (anum && bnum) {
    a = +a;
    b = +b;
  }
  return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
};
const rcompareIdentifiers = (a, b) => compareIdentifiers$1(b, a);
var identifiers$1 = {
  compareIdentifiers: compareIdentifiers$1,
  rcompareIdentifiers
};
const debug = debug_1;
const { MAX_LENGTH, MAX_SAFE_INTEGER } = constants$3;
const { safeRe: re$1, t: t$1 } = reExports;
const parseOptions = parseOptions_1;
const { compareIdentifiers } = identifiers$1;
const isPrereleaseIdentifier = (prerelease2, identifier) => {
  const identifiers2 = identifier.split(".");
  if (identifiers2.length > prerelease2.length) {
    return false;
  }
  for (let i = 0; i < identifiers2.length; i++) {
    if (compareIdentifiers(prerelease2[i], identifiers2[i]) !== 0) {
      return false;
    }
  }
  return true;
};
let SemVer$e = class SemVer {
  constructor(version2, options) {
    options = parseOptions(options);
    if (version2 instanceof SemVer) {
      if (version2.loose === !!options.loose && version2.includePrerelease === !!options.includePrerelease) {
        return version2;
      } else {
        version2 = version2.version;
      }
    } else if (typeof version2 !== "string") {
      throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version2}".`);
    }
    if (version2.length > MAX_LENGTH) {
      throw new TypeError(
        `version is longer than ${MAX_LENGTH} characters`
      );
    }
    debug("SemVer", version2, options);
    this.options = options;
    this.loose = !!options.loose;
    this.includePrerelease = !!options.includePrerelease;
    const m = version2.trim().match(options.loose ? re$1[t$1.LOOSE] : re$1[t$1.FULL]);
    if (!m) {
      throw new TypeError(`Invalid Version: ${version2}`);
    }
    this.raw = version2;
    this.major = +m[1];
    this.minor = +m[2];
    this.patch = +m[3];
    if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
      throw new TypeError("Invalid major version");
    }
    if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
      throw new TypeError("Invalid minor version");
    }
    if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
      throw new TypeError("Invalid patch version");
    }
    if (!m[4]) {
      this.prerelease = [];
    } else {
      this.prerelease = m[4].split(".").map((id2) => {
        if (/^[0-9]+$/.test(id2)) {
          const num = +id2;
          if (num >= 0 && num < MAX_SAFE_INTEGER) {
            return num;
          }
        }
        return id2;
      });
    }
    this.build = m[5] ? m[5].split(".") : [];
    this.format();
  }
  format() {
    this.version = `${this.major}.${this.minor}.${this.patch}`;
    if (this.prerelease.length) {
      this.version += `-${this.prerelease.join(".")}`;
    }
    return this.version;
  }
  toString() {
    return this.version;
  }
  compare(other) {
    debug("SemVer.compare", this.version, this.options, other);
    if (!(other instanceof SemVer)) {
      if (typeof other === "string" && other === this.version) {
        return 0;
      }
      other = new SemVer(other, this.options);
    }
    if (other.version === this.version) {
      return 0;
    }
    return this.compareMain(other) || this.comparePre(other);
  }
  compareMain(other) {
    if (!(other instanceof SemVer)) {
      other = new SemVer(other, this.options);
    }
    if (this.major < other.major) {
      return -1;
    }
    if (this.major > other.major) {
      return 1;
    }
    if (this.minor < other.minor) {
      return -1;
    }
    if (this.minor > other.minor) {
      return 1;
    }
    if (this.patch < other.patch) {
      return -1;
    }
    if (this.patch > other.patch) {
      return 1;
    }
    return 0;
  }
  comparePre(other) {
    if (!(other instanceof SemVer)) {
      other = new SemVer(other, this.options);
    }
    if (this.prerelease.length && !other.prerelease.length) {
      return -1;
    } else if (!this.prerelease.length && other.prerelease.length) {
      return 1;
    } else if (!this.prerelease.length && !other.prerelease.length) {
      return 0;
    }
    let i = 0;
    do {
      const a = this.prerelease[i];
      const b = other.prerelease[i];
      debug("prerelease compare", i, a, b);
      if (a === void 0 && b === void 0) {
        return 0;
      } else if (b === void 0) {
        return 1;
      } else if (a === void 0) {
        return -1;
      } else if (a === b) {
        continue;
      } else {
        return compareIdentifiers(a, b);
      }
    } while (++i);
  }
  compareBuild(other) {
    if (!(other instanceof SemVer)) {
      other = new SemVer(other, this.options);
    }
    let i = 0;
    do {
      const a = this.build[i];
      const b = other.build[i];
      debug("build compare", i, a, b);
      if (a === void 0 && b === void 0) {
        return 0;
      } else if (b === void 0) {
        return 1;
      } else if (a === void 0) {
        return -1;
      } else if (a === b) {
        continue;
      } else {
        return compareIdentifiers(a, b);
      }
    } while (++i);
  }
  // preminor will bump the version up to the next minor release, and immediately
  // down to pre-release. premajor and prepatch work the same way.
  inc(release, identifier, identifierBase) {
    if (release.startsWith("pre")) {
      if (!identifier && identifierBase === false) {
        throw new Error("invalid increment argument: identifier is empty");
      }
      if (identifier) {
        const match = `-${identifier}`.match(this.options.loose ? re$1[t$1.PRERELEASELOOSE] : re$1[t$1.PRERELEASE]);
        if (!match || match[1] !== identifier) {
          throw new Error(`invalid identifier: ${identifier}`);
        }
      }
    }
    switch (release) {
      case "premajor":
        this.prerelease.length = 0;
        this.patch = 0;
        this.minor = 0;
        this.major++;
        this.inc("pre", identifier, identifierBase);
        break;
      case "preminor":
        this.prerelease.length = 0;
        this.patch = 0;
        this.minor++;
        this.inc("pre", identifier, identifierBase);
        break;
      case "prepatch":
        this.prerelease.length = 0;
        this.inc("patch", identifier, identifierBase);
        this.inc("pre", identifier, identifierBase);
        break;
      case "prerelease":
        if (this.prerelease.length === 0) {
          this.inc("patch", identifier, identifierBase);
        }
        this.inc("pre", identifier, identifierBase);
        break;
      case "release":
        if (this.prerelease.length === 0) {
          throw new Error(`version ${this.raw} is not a prerelease`);
        }
        this.prerelease.length = 0;
        break;
      case "major":
        if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
          this.major++;
        }
        this.minor = 0;
        this.patch = 0;
        this.prerelease = [];
        break;
      case "minor":
        if (this.patch !== 0 || this.prerelease.length === 0) {
          this.minor++;
        }
        this.patch = 0;
        this.prerelease = [];
        break;
      case "patch":
        if (this.prerelease.length === 0) {
          this.patch++;
        }
        this.prerelease = [];
        break;
      case "pre": {
        const base = Number(identifierBase) ? 1 : 0;
        if (this.prerelease.length === 0) {
          this.prerelease = [base];
        } else {
          let i = this.prerelease.length;
          while (--i >= 0) {
            if (typeof this.prerelease[i] === "number") {
              this.prerelease[i]++;
              i = -2;
            }
          }
          if (i === -1) {
            if (identifier === this.prerelease.join(".") && identifierBase === false) {
              throw new Error("invalid increment argument: identifier already exists");
            }
            this.prerelease.push(base);
          }
        }
        if (identifier) {
          let prerelease2 = [identifier, base];
          if (identifierBase === false) {
            prerelease2 = [identifier];
          }
          if (isPrereleaseIdentifier(this.prerelease, identifier)) {
            const prereleaseBase = this.prerelease[identifier.split(".").length];
            if (isNaN(prereleaseBase)) {
              this.prerelease = prerelease2;
            }
          } else {
            this.prerelease = prerelease2;
          }
        }
        break;
      }
      default:
        throw new Error(`invalid increment argument: ${release}`);
    }
    this.raw = this.format();
    if (this.build.length) {
      this.raw += `+${this.build.join(".")}`;
    }
    return this;
  }
};
var semver$1 = SemVer$e;
const SemVer$d = semver$1;
const parse$7 = (version2, options, throwErrors = false) => {
  if (version2 instanceof SemVer$d) {
    return version2;
  }
  try {
    return new SemVer$d(version2, options);
  } catch (er) {
    if (!throwErrors) {
      return null;
    }
    throw er;
  }
};
var parse_1 = parse$7;
const parse$6 = parse_1;
const valid$2 = (version2, options) => {
  const v = parse$6(version2, options);
  return v ? v.version : null;
};
var valid_1 = valid$2;
const parse$5 = parse_1;
const clean$1 = (version2, options) => {
  const s = parse$5(version2.trim().replace(/^[=v]+/, ""), options);
  return s ? s.version : null;
};
var clean_1 = clean$1;
const SemVer$c = semver$1;
const inc$1 = (version2, release, options, identifier, identifierBase) => {
  if (typeof options === "string") {
    identifierBase = identifier;
    identifier = options;
    options = void 0;
  }
  try {
    return new SemVer$c(
      version2 instanceof SemVer$c ? version2.version : version2,
      options
    ).inc(release, identifier, identifierBase).version;
  } catch (er) {
    return null;
  }
};
var inc_1 = inc$1;
const parse$4 = parse_1;
const diff$1 = (version1, version2) => {
  const v1 = parse$4(version1, null, true);
  const v2 = parse$4(version2, null, true);
  const comparison = v1.compare(v2);
  if (comparison === 0) {
    return null;
  }
  const v1Higher = comparison > 0;
  const highVersion = v1Higher ? v1 : v2;
  const lowVersion = v1Higher ? v2 : v1;
  const highHasPre = !!highVersion.prerelease.length;
  const lowHasPre = !!lowVersion.prerelease.length;
  if (lowHasPre && !highHasPre) {
    if (!lowVersion.patch && !lowVersion.minor) {
      return "major";
    }
    if (lowVersion.compareMain(highVersion) === 0) {
      if (lowVersion.minor && !lowVersion.patch) {
        return "minor";
      }
      return "patch";
    }
  }
  const prefix = highHasPre ? "pre" : "";
  if (v1.major !== v2.major) {
    return prefix + "major";
  }
  if (v1.minor !== v2.minor) {
    return prefix + "minor";
  }
  if (v1.patch !== v2.patch) {
    return prefix + "patch";
  }
  return "prerelease";
};
var diff_1 = diff$1;
const SemVer$b = semver$1;
const major$1 = (a, loose) => new SemVer$b(a, loose).major;
var major_1 = major$1;
const SemVer$a = semver$1;
const minor$1 = (a, loose) => new SemVer$a(a, loose).minor;
var minor_1 = minor$1;
const SemVer$9 = semver$1;
const patch$1 = (a, loose) => new SemVer$9(a, loose).patch;
var patch_1 = patch$1;
const parse$3 = parse_1;
const prerelease$1 = (version2, options) => {
  const parsed = parse$3(version2, options);
  return parsed && parsed.prerelease.length ? parsed.prerelease : null;
};
var prerelease_1 = prerelease$1;
const SemVer$8 = semver$1;
const compare$b = (a, b, loose) => new SemVer$8(a, loose).compare(new SemVer$8(b, loose));
var compare_1 = compare$b;
const compare$a = compare_1;
const rcompare$1 = (a, b, loose) => compare$a(b, a, loose);
var rcompare_1 = rcompare$1;
const compare$9 = compare_1;
const compareLoose$1 = (a, b) => compare$9(a, b, true);
var compareLoose_1 = compareLoose$1;
const SemVer$7 = semver$1;
const compareBuild$3 = (a, b, loose) => {
  const versionA = new SemVer$7(a, loose);
  const versionB = new SemVer$7(b, loose);
  return versionA.compare(versionB) || versionA.compareBuild(versionB);
};
var compareBuild_1 = compareBuild$3;
const compareBuild$2 = compareBuild_1;
const sort$1 = (list, loose) => list.sort((a, b) => compareBuild$2(a, b, loose));
var sort_1 = sort$1;
const compareBuild$1 = compareBuild_1;
const rsort$1 = (list, loose) => list.sort((a, b) => compareBuild$1(b, a, loose));
var rsort_1 = rsort$1;
const compare$8 = compare_1;
const gt$4 = (a, b, loose) => compare$8(a, b, loose) > 0;
var gt_1 = gt$4;
const compare$7 = compare_1;
const lt$3 = (a, b, loose) => compare$7(a, b, loose) < 0;
var lt_1 = lt$3;
const compare$6 = compare_1;
const eq$2 = (a, b, loose) => compare$6(a, b, loose) === 0;
var eq_1 = eq$2;
const compare$5 = compare_1;
const neq$2 = (a, b, loose) => compare$5(a, b, loose) !== 0;
var neq_1 = neq$2;
const compare$4 = compare_1;
const gte$3 = (a, b, loose) => compare$4(a, b, loose) >= 0;
var gte_1 = gte$3;
const compare$3 = compare_1;
const lte$3 = (a, b, loose) => compare$3(a, b, loose) <= 0;
var lte_1 = lte$3;
const eq$1 = eq_1;
const neq$1 = neq_1;
const gt$3 = gt_1;
const gte$2 = gte_1;
const lt$2 = lt_1;
const lte$2 = lte_1;
const cmp$1 = (a, op, b, loose) => {
  switch (op) {
    case "===":
      if (typeof a === "object") {
        a = a.version;
      }
      if (typeof b === "object") {
        b = b.version;
      }
      return a === b;
    case "!==":
      if (typeof a === "object") {
        a = a.version;
      }
      if (typeof b === "object") {
        b = b.version;
      }
      return a !== b;
    case "":
    case "=":
    case "==":
      return eq$1(a, b, loose);
    case "!=":
      return neq$1(a, b, loose);
    case ">":
      return gt$3(a, b, loose);
    case ">=":
      return gte$2(a, b, loose);
    case "<":
      return lt$2(a, b, loose);
    case "<=":
      return lte$2(a, b, loose);
    default:
      throw new TypeError(`Invalid operator: ${op}`);
  }
};
var cmp_1 = cmp$1;
const SemVer$6 = semver$1;
const parse$2 = parse_1;
const { safeRe: re, t } = reExports;
const coerce$1 = (version2, options) => {
  if (version2 instanceof SemVer$6) {
    return version2;
  }
  if (typeof version2 === "number") {
    version2 = String(version2);
  }
  if (typeof version2 !== "string") {
    return null;
  }
  options = options || {};
  let match = null;
  if (!options.rtl) {
    match = version2.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
  } else {
    const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
    let next;
    while ((next = coerceRtlRegex.exec(version2)) && (!match || match.index + match[0].length !== version2.length)) {
      if (!match || next.index + next[0].length !== match.index + match[0].length) {
        match = next;
      }
      coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
    }
    coerceRtlRegex.lastIndex = -1;
  }
  if (match === null) {
    return null;
  }
  const major2 = match[2];
  const minor2 = match[3] || "0";
  const patch2 = match[4] || "0";
  const prerelease2 = options.includePrerelease && match[5] ? `-${match[5]}` : "";
  const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
  return parse$2(`${major2}.${minor2}.${patch2}${prerelease2}${build}`, options);
};
var coerce_1 = coerce$1;
const parse$1 = parse_1;
const constants$2 = constants$3;
const SemVer$5 = semver$1;
const truncate$1 = (version2, truncation, options) => {
  if (!constants$2.RELEASE_TYPES.includes(truncation)) {
    return null;
  }
  const clonedVersion = cloneInputVersion(version2, options);
  return clonedVersion && doTruncation(clonedVersion, truncation);
};
const cloneInputVersion = (version2, options) => {
  const versionStringToParse = version2 instanceof SemVer$5 ? version2.version : version2;
  return parse$1(versionStringToParse, options);
};
const doTruncation = (version2, truncation) => {
  if (isPrerelease(truncation)) {
    return version2.version;
  }
  version2.prerelease = [];
  switch (truncation) {
    case "major":
      version2.minor = 0;
      version2.patch = 0;
      break;
    case "minor":
      version2.patch = 0;
      break;
  }
  return version2.format();
};
const isPrerelease = (type2) => {
  return type2.startsWith("pre");
};
var truncate_1 = truncate$1;
class LRUCache {
  constructor() {
    this.max = 1e3;
    this.map = /* @__PURE__ */ new Map();
  }
  get(key) {
    const value = this.map.get(key);
    if (value === void 0) {
      return void 0;
    } else {
      this.map.delete(key);
      this.map.set(key, value);
      return value;
    }
  }
  delete(key) {
    return this.map.delete(key);
  }
  set(key, value) {
    const deleted = this.delete(key);
    if (!deleted && value !== void 0) {
      if (this.map.size >= this.max) {
        const firstKey = this.map.keys().next().value;
        this.delete(firstKey);
      }
      this.map.set(key, value);
    }
    return this;
  }
}
var lrucache = LRUCache;
var range;
var hasRequiredRange;
function requireRange() {
  if (hasRequiredRange) return range;
  hasRequiredRange = 1;
  const SPACE_CHARACTERS = /\s+/g;
  class Range2 {
    constructor(range2, options) {
      options = parseOptions2(options);
      if (range2 instanceof Range2) {
        if (range2.loose === !!options.loose && range2.includePrerelease === !!options.includePrerelease) {
          return range2;
        } else {
          return new Range2(range2.raw, options);
        }
      }
      if (range2 instanceof Comparator2) {
        this.raw = range2.value;
        this.set = [[range2]];
        this.formatted = void 0;
        return this;
      }
      this.options = options;
      this.loose = !!options.loose;
      this.includePrerelease = !!options.includePrerelease;
      this.raw = range2.trim().replace(SPACE_CHARACTERS, " ");
      this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
      if (!this.set.length) {
        throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
      }
      if (this.set.length > 1) {
        const first = this.set[0];
        this.set = this.set.filter((c) => !isNullSet(c[0]));
        if (this.set.length === 0) {
          this.set = [first];
        } else if (this.set.length > 1) {
          for (const c of this.set) {
            if (c.length === 1 && isAny(c[0])) {
              this.set = [c];
              break;
            }
          }
        }
      }
      this.formatted = void 0;
    }
    get range() {
      if (this.formatted === void 0) {
        this.formatted = "";
        for (let i = 0; i < this.set.length; i++) {
          if (i > 0) {
            this.formatted += "||";
          }
          const comps = this.set[i];
          for (let k = 0; k < comps.length; k++) {
            if (k > 0) {
              this.formatted += " ";
            }
            this.formatted += comps[k].toString().trim();
          }
        }
      }
      return this.formatted;
    }
    format() {
      return this.range;
    }
    toString() {
      return this.range;
    }
    parseRange(range2) {
      range2 = range2.replace(BUILDSTRIPRE, "");
      const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
      const memoKey = memoOpts + ":" + range2;
      const cached = cache.get(memoKey);
      if (cached) {
        return cached;
      }
      const loose = this.options.loose;
      const hr = loose ? re2[t2.HYPHENRANGELOOSE] : re2[t2.HYPHENRANGE];
      range2 = range2.replace(hr, hyphenReplace(this.options.includePrerelease));
      debug2("hyphen replace", range2);
      range2 = range2.replace(re2[t2.COMPARATORTRIM], comparatorTrimReplace);
      debug2("comparator trim", range2);
      range2 = range2.replace(re2[t2.TILDETRIM], tildeTrimReplace);
      debug2("tilde trim", range2);
      range2 = range2.replace(re2[t2.CARETTRIM], caretTrimReplace);
      debug2("caret trim", range2);
      let rangeList = range2.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
      if (loose) {
        rangeList = rangeList.filter((comp) => {
          debug2("loose invalid filter", comp, this.options);
          return !!comp.match(re2[t2.COMPARATORLOOSE]);
        });
      }
      debug2("range list", rangeList);
      const rangeMap = /* @__PURE__ */ new Map();
      const comparators = rangeList.map((comp) => new Comparator2(comp, this.options));
      for (const comp of comparators) {
        if (isNullSet(comp)) {
          return [comp];
        }
        rangeMap.set(comp.value, comp);
      }
      if (rangeMap.size > 1 && rangeMap.has("")) {
        rangeMap.delete("");
      }
      const result = [...rangeMap.values()];
      cache.set(memoKey, result);
      return result;
    }
    intersects(range2, options) {
      if (!(range2 instanceof Range2)) {
        throw new TypeError("a Range is required");
      }
      return this.set.some((thisComparators) => {
        return isSatisfiable(thisComparators, options) && range2.set.some((rangeComparators) => {
          return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
            return rangeComparators.every((rangeComparator) => {
              return thisComparator.intersects(rangeComparator, options);
            });
          });
        });
      });
    }
    // if ANY of the sets match ALL of its comparators, then pass
    test(version2) {
      if (!version2) {
        return false;
      }
      if (typeof version2 === "string") {
        try {
          version2 = new SemVer3(version2, this.options);
        } catch (er) {
          return false;
        }
      }
      for (let i = 0; i < this.set.length; i++) {
        if (testSet(this.set[i], version2, this.options)) {
          return true;
        }
      }
      return false;
    }
  }
  range = Range2;
  const LRU = lrucache;
  const cache = new LRU();
  const parseOptions2 = parseOptions_1;
  const Comparator2 = requireComparator();
  const debug2 = debug_1;
  const SemVer3 = semver$1;
  const {
    safeRe: re2,
    src,
    t: t2,
    comparatorTrimReplace,
    tildeTrimReplace,
    caretTrimReplace
  } = reExports;
  const { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = constants$3;
  const BUILDSTRIPRE = new RegExp(src[t2.BUILD], "g");
  const isNullSet = (c) => c.value === "<0.0.0-0";
  const isAny = (c) => c.value === "";
  const isSatisfiable = (comparators, options) => {
    let result = true;
    const remainingComparators = comparators.slice();
    let testComparator = remainingComparators.pop();
    while (result && remainingComparators.length) {
      result = remainingComparators.every((otherComparator) => {
        return testComparator.intersects(otherComparator, options);
      });
      testComparator = remainingComparators.pop();
    }
    return result;
  };
  const parseComparator = (comp, options) => {
    comp = comp.replace(re2[t2.BUILD], "");
    debug2("comp", comp, options);
    comp = replaceCarets(comp, options);
    debug2("caret", comp);
    comp = replaceTildes(comp, options);
    debug2("tildes", comp);
    comp = replaceXRanges(comp, options);
    debug2("xrange", comp);
    comp = replaceStars(comp, options);
    debug2("stars", comp);
    return comp;
  };
  const isX = (id2) => !id2 || id2.toLowerCase() === "x" || id2 === "*";
  const invalidXRangeOrder = (M, m, p) => isX(M) && !isX(m) || isX(m) && p && !isX(p);
  const replaceTildes = (comp, options) => {
    return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
  };
  const replaceTilde = (comp, options) => {
    const r = options.loose ? re2[t2.TILDELOOSE] : re2[t2.TILDE];
    return comp.replace(r, (_, M, m, p, pr) => {
      debug2("tilde", comp, _, M, m, p, pr);
      let ret;
      if (isX(M)) {
        ret = "";
      } else if (isX(m)) {
        ret = `>=${M}.0.0 <${+M + 1}.0.0-0`;
      } else if (isX(p)) {
        ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0-0`;
      } else if (pr) {
        debug2("replaceTilde pr", pr);
        ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
      } else {
        ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
      }
      debug2("tilde return", ret);
      return ret;
    });
  };
  const replaceCarets = (comp, options) => {
    return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
  };
  const replaceCaret = (comp, options) => {
    debug2("caret", comp, options);
    const r = options.loose ? re2[t2.CARETLOOSE] : re2[t2.CARET];
    const z = options.includePrerelease ? "-0" : "";
    return comp.replace(r, (_, M, m, p, pr) => {
      debug2("caret", comp, _, M, m, p, pr);
      let ret;
      if (isX(M)) {
        ret = "";
      } else if (isX(m)) {
        ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
      } else if (isX(p)) {
        if (M === "0") {
          ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
        }
      } else if (pr) {
        debug2("replaceCaret pr", pr);
        if (M === "0") {
          if (m === "0") {
            ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
          }
        } else {
          ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
        }
      } else {
        debug2("no pr");
        if (M === "0") {
          if (m === "0") {
            ret = `>=${M}.${m}.${p} <${M}.${m}.${+p + 1}-0`;
          } else {
            ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
          }
        } else {
          ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
        }
      }
      debug2("caret return", ret);
      return ret;
    });
  };
  const replaceXRanges = (comp, options) => {
    debug2("replaceXRanges", comp, options);
    return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
  };
  const replaceXRange = (comp, options) => {
    comp = comp.trim();
    const r = options.loose ? re2[t2.XRANGELOOSE] : re2[t2.XRANGE];
    return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
      debug2("xRange", comp, ret, gtlt, M, m, p, pr);
      if (invalidXRangeOrder(M, m, p)) {
        return comp;
      }
      const xM = isX(M);
      const xm = xM || isX(m);
      const xp = xm || isX(p);
      const anyX = xp;
      if (gtlt === "=" && anyX) {
        gtlt = "";
      }
      pr = options.includePrerelease ? "-0" : "";
      if (xM) {
        if (gtlt === ">" || gtlt === "<") {
          ret = "<0.0.0-0";
        } else {
          ret = "*";
        }
      } else if (gtlt && anyX) {
        if (xm) {
          m = 0;
        }
        p = 0;
        if (gtlt === ">") {
          gtlt = ">=";
          if (xm) {
            M = +M + 1;
            m = 0;
            p = 0;
          } else {
            m = +m + 1;
            p = 0;
          }
        } else if (gtlt === "<=") {
          gtlt = "<";
          if (xm) {
            M = +M + 1;
          } else {
            m = +m + 1;
          }
        }
        if (gtlt === "<") {
          pr = "-0";
        }
        ret = `${gtlt + M}.${m}.${p}${pr}`;
      } else if (xm) {
        ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
      } else if (xp) {
        ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
      }
      debug2("xRange return", ret);
      return ret;
    });
  };
  const replaceStars = (comp, options) => {
    debug2("replaceStars", comp, options);
    return comp.trim().replace(re2[t2.STAR], "");
  };
  const replaceGTE0 = (comp, options) => {
    debug2("replaceGTE0", comp, options);
    return comp.trim().replace(re2[options.includePrerelease ? t2.GTE0PRE : t2.GTE0], "");
  };
  const hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
    if (isX(fM)) {
      from = "";
    } else if (isX(fm)) {
      from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
    } else if (isX(fp)) {
      from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
    } else if (fpr) {
      from = `>=${from}`;
    } else {
      from = `>=${from}${incPr ? "-0" : ""}`;
    }
    if (isX(tM)) {
      to = "";
    } else if (isX(tm)) {
      to = `<${+tM + 1}.0.0-0`;
    } else if (isX(tp)) {
      to = `<${tM}.${+tm + 1}.0-0`;
    } else if (tpr) {
      to = `<=${tM}.${tm}.${tp}-${tpr}`;
    } else if (incPr) {
      to = `<${tM}.${tm}.${+tp + 1}-0`;
    } else {
      to = `<=${to}`;
    }
    return `${from} ${to}`.trim();
  };
  const testSet = (set, version2, options) => {
    for (let i = 0; i < set.length; i++) {
      if (!set[i].test(version2)) {
        return false;
      }
    }
    if (version2.prerelease.length && !options.includePrerelease) {
      for (let i = 0; i < set.length; i++) {
        debug2(set[i].semver);
        if (set[i].semver === Comparator2.ANY) {
          continue;
        }
        if (set[i].semver.prerelease.length > 0) {
          const allowed = set[i].semver;
          if (allowed.major === version2.major && allowed.minor === version2.minor && allowed.patch === version2.patch) {
            return true;
          }
        }
      }
      return false;
    }
    return true;
  };
  return range;
}
var comparator;
var hasRequiredComparator;
function requireComparator() {
  if (hasRequiredComparator) return comparator;
  hasRequiredComparator = 1;
  const ANY2 = Symbol("SemVer ANY");
  class Comparator2 {
    static get ANY() {
      return ANY2;
    }
    constructor(comp, options) {
      options = parseOptions2(options);
      if (comp instanceof Comparator2) {
        if (comp.loose === !!options.loose) {
          return comp;
        } else {
          comp = comp.value;
        }
      }
      comp = comp.trim().split(/\s+/).join(" ");
      debug2("comparator", comp, options);
      this.options = options;
      this.loose = !!options.loose;
      this.parse(comp);
      if (this.semver === ANY2) {
        this.value = "";
      } else {
        this.value = this.operator + this.semver.version;
      }
      debug2("comp", this);
    }
    parse(comp) {
      const r = this.options.loose ? re2[t2.COMPARATORLOOSE] : re2[t2.COMPARATOR];
      const m = comp.match(r);
      if (!m) {
        throw new TypeError(`Invalid comparator: ${comp}`);
      }
      this.operator = m[1] !== void 0 ? m[1] : "";
      if (this.operator === "=") {
        this.operator = "";
      }
      if (!m[2]) {
        this.semver = ANY2;
      } else {
        this.semver = new SemVer3(m[2], this.options.loose);
      }
    }
    toString() {
      return this.value;
    }
    test(version2) {
      debug2("Comparator.test", version2, this.options.loose);
      if (this.semver === ANY2 || version2 === ANY2) {
        return true;
      }
      if (typeof version2 === "string") {
        try {
          version2 = new SemVer3(version2, this.options);
        } catch (er) {
          return false;
        }
      }
      return cmp2(version2, this.operator, this.semver, this.options);
    }
    intersects(comp, options) {
      if (!(comp instanceof Comparator2)) {
        throw new TypeError("a Comparator is required");
      }
      if (this.operator === "") {
        if (this.value === "") {
          return true;
        }
        return new Range2(comp.value, options).test(this.value);
      } else if (comp.operator === "") {
        if (comp.value === "") {
          return true;
        }
        return new Range2(this.value, options).test(comp.semver);
      }
      options = parseOptions2(options);
      if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
        return false;
      }
      if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
        return false;
      }
      if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
        return true;
      }
      if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
        return true;
      }
      if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
        return true;
      }
      if (cmp2(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
        return true;
      }
      if (cmp2(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
        return true;
      }
      return false;
    }
  }
  comparator = Comparator2;
  const parseOptions2 = parseOptions_1;
  const { safeRe: re2, t: t2 } = reExports;
  const cmp2 = cmp_1;
  const debug2 = debug_1;
  const SemVer3 = semver$1;
  const Range2 = requireRange();
  return comparator;
}
const Range$9 = requireRange();
const satisfies$4 = (version2, range2, options) => {
  try {
    range2 = new Range$9(range2, options);
  } catch (er) {
    return false;
  }
  return range2.test(version2);
};
var satisfies_1 = satisfies$4;
const Range$8 = requireRange();
const toComparators$1 = (range2, options) => new Range$8(range2, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
var toComparators_1 = toComparators$1;
const SemVer$4 = semver$1;
const Range$7 = requireRange();
const maxSatisfying$1 = (versions, range2, options) => {
  let max = null;
  let maxSV = null;
  let rangeObj = null;
  try {
    rangeObj = new Range$7(range2, options);
  } catch (er) {
    return null;
  }
  versions.forEach((v) => {
    if (rangeObj.test(v)) {
      if (!max || maxSV.compare(v) === -1) {
        max = v;
        maxSV = new SemVer$4(max, options);
      }
    }
  });
  return max;
};
var maxSatisfying_1 = maxSatisfying$1;
const SemVer$3 = semver$1;
const Range$6 = requireRange();
const minSatisfying$1 = (versions, range2, options) => {
  let min = null;
  let minSV = null;
  let rangeObj = null;
  try {
    rangeObj = new Range$6(range2, options);
  } catch (er) {
    return null;
  }
  versions.forEach((v) => {
    if (rangeObj.test(v)) {
      if (!min || minSV.compare(v) === 1) {
        min = v;
        minSV = new SemVer$3(min, options);
      }
    }
  });
  return min;
};
var minSatisfying_1 = minSatisfying$1;
const SemVer$2 = semver$1;
const Range$5 = requireRange();
const gt$2 = gt_1;
const minVersion$1 = (range2, loose) => {
  range2 = new Range$5(range2, loose);
  let minver = new SemVer$2("0.0.0");
  if (range2.test(minver)) {
    return minver;
  }
  minver = new SemVer$2("0.0.0-0");
  if (range2.test(minver)) {
    return minver;
  }
  minver = null;
  for (let i = 0; i < range2.set.length; ++i) {
    const comparators = range2.set[i];
    let setMin = null;
    comparators.forEach((comparator2) => {
      const compver = new SemVer$2(comparator2.semver.version);
      switch (comparator2.operator) {
        case ">":
          if (compver.prerelease.length === 0) {
            compver.patch++;
          } else {
            compver.prerelease.push(0);
          }
          compver.raw = compver.format();
        case "":
        case ">=":
          if (!setMin || gt$2(compver, setMin)) {
            setMin = compver;
          }
          break;
        case "<":
        case "<=":
          break;
        default:
          throw new Error(`Unexpected operation: ${comparator2.operator}`);
      }
    });
    if (setMin && (!minver || gt$2(minver, setMin))) {
      minver = setMin;
    }
  }
  if (minver && range2.test(minver)) {
    return minver;
  }
  return null;
};
var minVersion_1 = minVersion$1;
const Range$4 = requireRange();
const validRange$1 = (range2, options) => {
  try {
    return new Range$4(range2, options).range || "*";
  } catch (er) {
    return null;
  }
};
var valid$1 = validRange$1;
const SemVer$1 = semver$1;
const Comparator$2 = requireComparator();
const { ANY: ANY$1 } = Comparator$2;
const Range$3 = requireRange();
const satisfies$3 = satisfies_1;
const gt$1 = gt_1;
const lt$1 = lt_1;
const lte$1 = lte_1;
const gte$1 = gte_1;
const outside$3 = (version2, range2, hilo, options) => {
  version2 = new SemVer$1(version2, options);
  range2 = new Range$3(range2, options);
  let gtfn, ltefn, ltfn, comp, ecomp;
  switch (hilo) {
    case ">":
      gtfn = gt$1;
      ltefn = lte$1;
      ltfn = lt$1;
      comp = ">";
      ecomp = ">=";
      break;
    case "<":
      gtfn = lt$1;
      ltefn = gte$1;
      ltfn = gt$1;
      comp = "<";
      ecomp = "<=";
      break;
    default:
      throw new TypeError('Must provide a hilo val of "<" or ">"');
  }
  if (satisfies$3(version2, range2, options)) {
    return false;
  }
  for (let i = 0; i < range2.set.length; ++i) {
    const comparators = range2.set[i];
    let high = null;
    let low = null;
    comparators.forEach((comparator2) => {
      if (comparator2.semver === ANY$1) {
        comparator2 = new Comparator$2(">=0.0.0");
      }
      high = high || comparator2;
      low = low || comparator2;
      if (gtfn(comparator2.semver, high.semver, options)) {
        high = comparator2;
      } else if (ltfn(comparator2.semver, low.semver, options)) {
        low = comparator2;
      }
    });
    if (high.operator === comp || high.operator === ecomp) {
      return false;
    }
    if ((!low.operator || low.operator === comp) && ltefn(version2, low.semver)) {
      return false;
    } else if (low.operator === ecomp && ltfn(version2, low.semver)) {
      return false;
    }
  }
  return true;
};
var outside_1 = outside$3;
const outside$2 = outside_1;
const gtr$1 = (version2, range2, options) => outside$2(version2, range2, ">", options);
var gtr_1 = gtr$1;
const outside$1 = outside_1;
const ltr$1 = (version2, range2, options) => outside$1(version2, range2, "<", options);
var ltr_1 = ltr$1;
const Range$2 = requireRange();
const intersects$1 = (r1, r2, options) => {
  r1 = new Range$2(r1, options);
  r2 = new Range$2(r2, options);
  return r1.intersects(r2, options);
};
var intersects_1 = intersects$1;
const satisfies$2 = satisfies_1;
const compare$2 = compare_1;
var simplify = (versions, range2, options) => {
  const set = [];
  let first = null;
  let prev = null;
  const v = versions.sort((a, b) => compare$2(a, b, options));
  for (const version2 of v) {
    const included = satisfies$2(version2, range2, options);
    if (included) {
      prev = version2;
      if (!first) {
        first = version2;
      }
    } else {
      if (prev) {
        set.push([first, prev]);
      }
      prev = null;
      first = null;
    }
  }
  if (first) {
    set.push([first, null]);
  }
  const ranges = [];
  for (const [min, max] of set) {
    if (min === max) {
      ranges.push(min);
    } else if (!max && min === v[0]) {
      ranges.push("*");
    } else if (!max) {
      ranges.push(`>=${min}`);
    } else if (min === v[0]) {
      ranges.push(`<=${max}`);
    } else {
      ranges.push(`${min} - ${max}`);
    }
  }
  const simplified = ranges.join(" || ");
  const original = typeof range2.raw === "string" ? range2.raw : String(range2);
  return simplified.length < original.length ? simplified : range2;
};
const Range$1 = requireRange();
const Comparator$1 = requireComparator();
const { ANY } = Comparator$1;
const satisfies$1 = satisfies_1;
const compare$1 = compare_1;
const subset$1 = (sub, dom, options = {}) => {
  if (sub === dom) {
    return true;
  }
  sub = new Range$1(sub, options);
  dom = new Range$1(dom, options);
  let sawNonNull = false;
  OUTER: for (const simpleSub of sub.set) {
    for (const simpleDom of dom.set) {
      const isSub = simpleSubset(simpleSub, simpleDom, options);
      sawNonNull = sawNonNull || isSub !== null;
      if (isSub) {
        continue OUTER;
      }
    }
    if (sawNonNull) {
      return false;
    }
  }
  return true;
};
const minimumVersionWithPreRelease = [new Comparator$1(">=0.0.0-0")];
const minimumVersion = [new Comparator$1(">=0.0.0")];
const simpleSubset = (sub, dom, options) => {
  if (sub === dom) {
    return true;
  }
  if (sub.length === 1 && sub[0].semver === ANY) {
    if (dom.length === 1 && dom[0].semver === ANY) {
      return true;
    } else if (options.includePrerelease) {
      sub = minimumVersionWithPreRelease;
    } else {
      sub = minimumVersion;
    }
  }
  if (dom.length === 1 && dom[0].semver === ANY) {
    if (options.includePrerelease) {
      return true;
    } else {
      dom = minimumVersion;
    }
  }
  const eqSet = /* @__PURE__ */ new Set();
  let gt2, lt2;
  for (const c of sub) {
    if (c.operator === ">" || c.operator === ">=") {
      gt2 = higherGT(gt2, c, options);
    } else if (c.operator === "<" || c.operator === "<=") {
      lt2 = lowerLT(lt2, c, options);
    } else {
      eqSet.add(c.semver);
    }
  }
  if (eqSet.size > 1) {
    return null;
  }
  let gtltComp;
  if (gt2 && lt2) {
    gtltComp = compare$1(gt2.semver, lt2.semver, options);
    if (gtltComp > 0) {
      return null;
    } else if (gtltComp === 0 && (gt2.operator !== ">=" || lt2.operator !== "<=")) {
      return null;
    }
  }
  for (const eq2 of eqSet) {
    if (gt2 && !satisfies$1(eq2, String(gt2), options)) {
      return null;
    }
    if (lt2 && !satisfies$1(eq2, String(lt2), options)) {
      return null;
    }
    for (const c of dom) {
      if (!satisfies$1(eq2, String(c), options)) {
        return false;
      }
    }
    return true;
  }
  let higher, lower;
  let hasDomLT, hasDomGT;
  let needDomLTPre = lt2 && !options.includePrerelease && lt2.semver.prerelease.length ? lt2.semver : false;
  let needDomGTPre = gt2 && !options.includePrerelease && gt2.semver.prerelease.length ? gt2.semver : false;
  if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt2.operator === "<" && needDomLTPre.prerelease[0] === 0) {
    needDomLTPre = false;
  }
  for (const c of dom) {
    hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
    hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
    if (gt2) {
      if (needDomGTPre) {
        if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) {
          needDomGTPre = false;
        }
      }
      if (c.operator === ">" || c.operator === ">=") {
        higher = higherGT(gt2, c, options);
        if (higher === c && higher !== gt2) {
          return false;
        }
      } else if (gt2.operator === ">=" && !c.test(gt2.semver)) {
        return false;
      }
    }
    if (lt2) {
      if (needDomLTPre) {
        if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) {
          needDomLTPre = false;
        }
      }
      if (c.operator === "<" || c.operator === "<=") {
        lower = lowerLT(lt2, c, options);
        if (lower === c && lower !== lt2) {
          return false;
        }
      } else if (lt2.operator === "<=" && !c.test(lt2.semver)) {
        return false;
      }
    }
    if (!c.operator && (lt2 || gt2) && gtltComp !== 0) {
      return false;
    }
  }
  if (gt2 && hasDomLT && !lt2 && gtltComp !== 0) {
    return false;
  }
  if (lt2 && hasDomGT && !gt2 && gtltComp !== 0) {
    return false;
  }
  if (needDomGTPre || needDomLTPre) {
    return false;
  }
  return true;
};
const higherGT = (a, b, options) => {
  if (!a) {
    return b;
  }
  const comp = compare$1(a.semver, b.semver, options);
  return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
};
const lowerLT = (a, b, options) => {
  if (!a) {
    return b;
  }
  const comp = compare$1(a.semver, b.semver, options);
  return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
};
var subset_1 = subset$1;
const internalRe = reExports;
const constants$1 = constants$3;
const SemVer2 = semver$1;
const identifiers = identifiers$1;
const parse = parse_1;
const valid = valid_1;
const clean = clean_1;
const inc = inc_1;
const diff = diff_1;
const major = major_1;
const minor = minor_1;
const patch = patch_1;
const prerelease = prerelease_1;
const compare = compare_1;
const rcompare = rcompare_1;
const compareLoose = compareLoose_1;
const compareBuild = compareBuild_1;
const sort = sort_1;
const rsort = rsort_1;
const gt = gt_1;
const lt = lt_1;
const eq = eq_1;
const neq = neq_1;
const gte = gte_1;
const lte = lte_1;
const cmp = cmp_1;
const coerce = coerce_1;
const truncate = truncate_1;
const Comparator = requireComparator();
const Range = requireRange();
const satisfies = satisfies_1;
const toComparators = toComparators_1;
const maxSatisfying = maxSatisfying_1;
const minSatisfying = minSatisfying_1;
const minVersion = minVersion_1;
const validRange = valid$1;
const outside = outside_1;
const gtr = gtr_1;
const ltr = ltr_1;
const intersects = intersects_1;
const simplifyRange = simplify;
const subset = subset_1;
var semver = {
  parse,
  valid,
  clean,
  inc,
  diff,
  major,
  minor,
  patch,
  prerelease,
  compare,
  rcompare,
  compareLoose,
  compareBuild,
  sort,
  rsort,
  gt,
  lt,
  eq,
  neq,
  gte,
  lte,
  cmp,
  coerce,
  truncate,
  Comparator,
  Range,
  satisfies,
  toComparators,
  maxSatisfying,
  minSatisfying,
  minVersion,
  validRange,
  outside,
  gtr,
  ltr,
  intersects,
  simplifyRange,
  subset,
  SemVer: SemVer2,
  re: internalRe.re,
  src: internalRe.src,
  tokens: internalRe.t,
  SEMVER_SPEC_VERSION: constants$1.SEMVER_SPEC_VERSION,
  RELEASE_TYPES: constants$1.RELEASE_TYPES,
  compareIdentifiers: identifiers.compareIdentifiers,
  rcompareIdentifiers: identifiers.rcompareIdentifiers
};
var onetime$1 = { exports: {} };
var mimicFn$2 = { exports: {} };
const mimicFn$1 = (to, from) => {
  for (const prop of Reflect.ownKeys(from)) {
    Object.defineProperty(to, prop, Object.getOwnPropertyDescriptor(from, prop));
  }
  return to;
};
mimicFn$2.exports = mimicFn$1;
mimicFn$2.exports.default = mimicFn$1;
var mimicFnExports = mimicFn$2.exports;
const mimicFn = mimicFnExports;
const calledFunctions = /* @__PURE__ */ new WeakMap();
const onetime = (function_, options = {}) => {
  if (typeof function_ !== "function") {
    throw new TypeError("Expected a function");
  }
  let returnValue;
  let callCount = 0;
  const functionName = function_.displayName || function_.name || "<anonymous>";
  const onetime2 = function(...arguments_) {
    calledFunctions.set(onetime2, ++callCount);
    if (callCount === 1) {
      returnValue = function_.apply(this, arguments_);
      function_ = null;
    } else if (options.throw === true) {
      throw new Error(`Function \`${functionName}\` can only be called once`);
    }
    return returnValue;
  };
  mimicFn(onetime2, function_);
  calledFunctions.set(onetime2, callCount);
  return onetime2;
};
onetime$1.exports = onetime;
onetime$1.exports.default = onetime;
onetime$1.exports.callCount = (function_) => {
  if (!calledFunctions.has(function_)) {
    throw new Error(`The given function \`${function_.name}\` is not wrapped by the \`onetime\` package`);
  }
  return calledFunctions.get(function_);
};
var onetimeExports = onetime$1.exports;
(function(module, exports) {
  var __classPrivateFieldSet = commonjsGlobal && commonjsGlobal.__classPrivateFieldSet || function(receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
      throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
  };
  var __classPrivateFieldGet = commonjsGlobal && commonjsGlobal.__classPrivateFieldGet || function(receiver, privateMap) {
    if (!privateMap.has(receiver)) {
      throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
  };
  var _a, _b;
  var _validator, _encryptionKey, _options, _defaultValues;
  Object.defineProperty(exports, "__esModule", { value: true });
  const fs2 = fs$4;
  const path2 = path$7;
  const crypto = require$$2$1;
  const assert = require$$3;
  const events_1 = require$$4$1;
  const dotProp$1 = dotProp;
  const makeDir2 = makeDirExports;
  const pkgUp2 = pkgUpExports;
  const envPaths2 = envPathsExports;
  const atomically = dist$1;
  const ajv_1 = ajv;
  const ajv_formats_1 = distExports;
  const debounceFn$1 = debounceFn;
  const semver$12 = semver;
  const onetime2 = onetimeExports;
  const encryptionAlgorithm = "aes-256-cbc";
  const createPlainObject = () => {
    return /* @__PURE__ */ Object.create(null);
  };
  const isExist = (data) => {
    return data !== void 0 && data !== null;
  };
  delete require.cache[__filename];
  const parentDir = path2.dirname((_b = (_a = module.parent) === null || _a === void 0 ? void 0 : _a.filename) !== null && _b !== void 0 ? _b : ".");
  const checkValueType = (key, value) => {
    const nonJsonTypes = /* @__PURE__ */ new Set([
      "undefined",
      "symbol",
      "function"
    ]);
    const type2 = typeof value;
    if (nonJsonTypes.has(type2)) {
      throw new TypeError(`Setting a value of type \`${type2}\` for key \`${key}\` is not allowed as it's not supported by JSON`);
    }
  };
  const INTERNAL_KEY = "__internal__";
  const MIGRATION_KEY = `${INTERNAL_KEY}.migrations.version`;
  class Conf2 {
    constructor(partialOptions = {}) {
      var _a2;
      _validator.set(this, void 0);
      _encryptionKey.set(this, void 0);
      _options.set(this, void 0);
      _defaultValues.set(this, {});
      this._deserialize = (value) => JSON.parse(value);
      this._serialize = (value) => JSON.stringify(value, null, "	");
      const options = {
        configName: "config",
        fileExtension: "json",
        projectSuffix: "nodejs",
        clearInvalidConfig: false,
        accessPropertiesByDotNotation: true,
        ...partialOptions
      };
      const getPackageData = onetime2(() => {
        const packagePath = pkgUp2.sync({ cwd: parentDir });
        const packageData = packagePath && JSON.parse(fs2.readFileSync(packagePath, "utf8"));
        return packageData !== null && packageData !== void 0 ? packageData : {};
      });
      if (!options.cwd) {
        if (!options.projectName) {
          options.projectName = getPackageData().name;
        }
        if (!options.projectName) {
          throw new Error("Project name could not be inferred. Please specify the `projectName` option.");
        }
        options.cwd = envPaths2(options.projectName, { suffix: options.projectSuffix }).config;
      }
      __classPrivateFieldSet(this, _options, options);
      if (options.schema) {
        if (typeof options.schema !== "object") {
          throw new TypeError("The `schema` option must be an object.");
        }
        const ajv2 = new ajv_1.default({
          allErrors: true,
          useDefaults: true
        });
        ajv_formats_1.default(ajv2);
        const schema = {
          type: "object",
          properties: options.schema
        };
        __classPrivateFieldSet(this, _validator, ajv2.compile(schema));
        for (const [key, value] of Object.entries(options.schema)) {
          if (value === null || value === void 0 ? void 0 : value.default) {
            __classPrivateFieldGet(this, _defaultValues)[key] = value.default;
          }
        }
      }
      if (options.defaults) {
        __classPrivateFieldSet(this, _defaultValues, {
          ...__classPrivateFieldGet(this, _defaultValues),
          ...options.defaults
        });
      }
      if (options.serialize) {
        this._serialize = options.serialize;
      }
      if (options.deserialize) {
        this._deserialize = options.deserialize;
      }
      this.events = new events_1.EventEmitter();
      __classPrivateFieldSet(this, _encryptionKey, options.encryptionKey);
      const fileExtension = options.fileExtension ? `.${options.fileExtension}` : "";
      this.path = path2.resolve(options.cwd, `${(_a2 = options.configName) !== null && _a2 !== void 0 ? _a2 : "config"}${fileExtension}`);
      const fileStore = this.store;
      const store2 = Object.assign(createPlainObject(), options.defaults, fileStore);
      this._validate(store2);
      try {
        assert.deepEqual(fileStore, store2);
      } catch (_b2) {
        this.store = store2;
      }
      if (options.watch) {
        this._watch();
      }
      if (options.migrations) {
        if (!options.projectVersion) {
          options.projectVersion = getPackageData().version;
        }
        if (!options.projectVersion) {
          throw new Error("Project version could not be inferred. Please specify the `projectVersion` option.");
        }
        this._migrate(options.migrations, options.projectVersion);
      }
    }
    get(key, defaultValue) {
      if (__classPrivateFieldGet(this, _options).accessPropertiesByDotNotation) {
        return this._get(key, defaultValue);
      }
      return key in this.store ? this.store[key] : defaultValue;
    }
    set(key, value) {
      if (typeof key !== "string" && typeof key !== "object") {
        throw new TypeError(`Expected \`key\` to be of type \`string\` or \`object\`, got ${typeof key}`);
      }
      if (typeof key !== "object" && value === void 0) {
        throw new TypeError("Use `delete()` to clear values");
      }
      if (this._containsReservedKey(key)) {
        throw new TypeError(`Please don't use the ${INTERNAL_KEY} key, as it's used to manage this module internal operations.`);
      }
      const { store: store2 } = this;
      const set = (key2, value2) => {
        checkValueType(key2, value2);
        if (__classPrivateFieldGet(this, _options).accessPropertiesByDotNotation) {
          dotProp$1.set(store2, key2, value2);
        } else {
          store2[key2] = value2;
        }
      };
      if (typeof key === "object") {
        const object = key;
        for (const [key2, value2] of Object.entries(object)) {
          set(key2, value2);
        }
      } else {
        set(key, value);
      }
      this.store = store2;
    }
    /**
        Check if an item exists.
    
        @param key - The key of the item to check.
        */
    has(key) {
      if (__classPrivateFieldGet(this, _options).accessPropertiesByDotNotation) {
        return dotProp$1.has(this.store, key);
      }
      return key in this.store;
    }
    /**
        Reset items to their default values, as defined by the `defaults` or `schema` option.
    
        @see `clear()` to reset all items.
    
        @param keys - The keys of the items to reset.
        */
    reset(...keys) {
      for (const key of keys) {
        if (isExist(__classPrivateFieldGet(this, _defaultValues)[key])) {
          this.set(key, __classPrivateFieldGet(this, _defaultValues)[key]);
        }
      }
    }
    /**
        Delete an item.
    
        @param key - The key of the item to delete.
        */
    delete(key) {
      const { store: store2 } = this;
      if (__classPrivateFieldGet(this, _options).accessPropertiesByDotNotation) {
        dotProp$1.delete(store2, key);
      } else {
        delete store2[key];
      }
      this.store = store2;
    }
    /**
        Delete all items.
    
        This resets known items to their default values, if defined by the `defaults` or `schema` option.
        */
    clear() {
      this.store = createPlainObject();
      for (const key of Object.keys(__classPrivateFieldGet(this, _defaultValues))) {
        this.reset(key);
      }
    }
    /**
        Watches the given `key`, calling `callback` on any changes.
    
        @param key - The key wo watch.
        @param callback - A callback function that is called on any changes. When a `key` is first set `oldValue` will be `undefined`, and when a key is deleted `newValue` will be `undefined`.
        @returns A function, that when called, will unsubscribe.
        */
    onDidChange(key, callback) {
      if (typeof key !== "string") {
        throw new TypeError(`Expected \`key\` to be of type \`string\`, got ${typeof key}`);
      }
      if (typeof callback !== "function") {
        throw new TypeError(`Expected \`callback\` to be of type \`function\`, got ${typeof callback}`);
      }
      return this._handleChange(() => this.get(key), callback);
    }
    /**
        Watches the whole config object, calling `callback` on any changes.
    
        @param callback - A callback function that is called on any changes. When a `key` is first set `oldValue` will be `undefined`, and when a key is deleted `newValue` will be `undefined`.
        @returns A function, that when called, will unsubscribe.
        */
    onDidAnyChange(callback) {
      if (typeof callback !== "function") {
        throw new TypeError(`Expected \`callback\` to be of type \`function\`, got ${typeof callback}`);
      }
      return this._handleChange(() => this.store, callback);
    }
    get size() {
      return Object.keys(this.store).length;
    }
    get store() {
      try {
        const data = fs2.readFileSync(this.path, __classPrivateFieldGet(this, _encryptionKey) ? null : "utf8");
        const dataString = this._encryptData(data);
        const deserializedData = this._deserialize(dataString);
        this._validate(deserializedData);
        return Object.assign(createPlainObject(), deserializedData);
      } catch (error2) {
        if (error2.code === "ENOENT") {
          this._ensureDirectory();
          return createPlainObject();
        }
        if (__classPrivateFieldGet(this, _options).clearInvalidConfig && error2.name === "SyntaxError") {
          return createPlainObject();
        }
        throw error2;
      }
    }
    set store(value) {
      this._ensureDirectory();
      this._validate(value);
      this._write(value);
      this.events.emit("change");
    }
    *[(_validator = /* @__PURE__ */ new WeakMap(), _encryptionKey = /* @__PURE__ */ new WeakMap(), _options = /* @__PURE__ */ new WeakMap(), _defaultValues = /* @__PURE__ */ new WeakMap(), Symbol.iterator)]() {
      for (const [key, value] of Object.entries(this.store)) {
        yield [key, value];
      }
    }
    _encryptData(data) {
      if (!__classPrivateFieldGet(this, _encryptionKey)) {
        return data.toString();
      }
      try {
        if (__classPrivateFieldGet(this, _encryptionKey)) {
          try {
            if (data.slice(16, 17).toString() === ":") {
              const initializationVector = data.slice(0, 16);
              const password = crypto.pbkdf2Sync(__classPrivateFieldGet(this, _encryptionKey), initializationVector.toString(), 1e4, 32, "sha512");
              const decipher = crypto.createDecipheriv(encryptionAlgorithm, password, initializationVector);
              data = Buffer.concat([decipher.update(Buffer.from(data.slice(17))), decipher.final()]).toString("utf8");
            } else {
              const decipher = crypto.createDecipher(encryptionAlgorithm, __classPrivateFieldGet(this, _encryptionKey));
              data = Buffer.concat([decipher.update(Buffer.from(data)), decipher.final()]).toString("utf8");
            }
          } catch (_a2) {
          }
        }
      } catch (_b2) {
      }
      return data.toString();
    }
    _handleChange(getter, callback) {
      let currentValue = getter();
      const onChange = () => {
        const oldValue = currentValue;
        const newValue = getter();
        try {
          assert.deepEqual(newValue, oldValue);
        } catch (_a2) {
          currentValue = newValue;
          callback.call(this, newValue, oldValue);
        }
      };
      this.events.on("change", onChange);
      return () => this.events.removeListener("change", onChange);
    }
    _validate(data) {
      if (!__classPrivateFieldGet(this, _validator)) {
        return;
      }
      const valid2 = __classPrivateFieldGet(this, _validator).call(this, data);
      if (valid2 || !__classPrivateFieldGet(this, _validator).errors) {
        return;
      }
      const errors2 = __classPrivateFieldGet(this, _validator).errors.map(({ dataPath, message = "" }) => `\`${dataPath.slice(1)}\` ${message}`);
      throw new Error("Config schema violation: " + errors2.join("; "));
    }
    _ensureDirectory() {
      makeDir2.sync(path2.dirname(this.path));
    }
    _write(value) {
      let data = this._serialize(value);
      if (__classPrivateFieldGet(this, _encryptionKey)) {
        const initializationVector = crypto.randomBytes(16);
        const password = crypto.pbkdf2Sync(__classPrivateFieldGet(this, _encryptionKey), initializationVector.toString(), 1e4, 32, "sha512");
        const cipher = crypto.createCipheriv(encryptionAlgorithm, password, initializationVector);
        data = Buffer.concat([initializationVector, Buffer.from(":"), cipher.update(Buffer.from(data)), cipher.final()]);
      }
      if (process.env.SNAP) {
        fs2.writeFileSync(this.path, data);
      } else {
        try {
          atomically.writeFileSync(this.path, data);
        } catch (error2) {
          if (error2.code === "EXDEV") {
            fs2.writeFileSync(this.path, data);
            return;
          }
          throw error2;
        }
      }
    }
    _watch() {
      this._ensureDirectory();
      if (!fs2.existsSync(this.path)) {
        this._write(createPlainObject());
      }
      fs2.watch(this.path, { persistent: false }, debounceFn$1(() => {
        this.events.emit("change");
      }, { wait: 100 }));
    }
    _migrate(migrations, versionToMigrate) {
      let previousMigratedVersion = this._get(MIGRATION_KEY, "0.0.0");
      const newerVersions = Object.keys(migrations).filter((candidateVersion) => this._shouldPerformMigration(candidateVersion, previousMigratedVersion, versionToMigrate));
      let storeBackup = { ...this.store };
      for (const version2 of newerVersions) {
        try {
          const migration = migrations[version2];
          migration(this);
          this._set(MIGRATION_KEY, version2);
          previousMigratedVersion = version2;
          storeBackup = { ...this.store };
        } catch (error2) {
          this.store = storeBackup;
          throw new Error(`Something went wrong during the migration! Changes applied to the store until this failed migration will be restored. ${error2}`);
        }
      }
      if (this._isVersionInRangeFormat(previousMigratedVersion) || !semver$12.eq(previousMigratedVersion, versionToMigrate)) {
        this._set(MIGRATION_KEY, versionToMigrate);
      }
    }
    _containsReservedKey(key) {
      if (typeof key === "object") {
        const firsKey = Object.keys(key)[0];
        if (firsKey === INTERNAL_KEY) {
          return true;
        }
      }
      if (typeof key !== "string") {
        return false;
      }
      if (__classPrivateFieldGet(this, _options).accessPropertiesByDotNotation) {
        if (key.startsWith(`${INTERNAL_KEY}.`)) {
          return true;
        }
        return false;
      }
      return false;
    }
    _isVersionInRangeFormat(version2) {
      return semver$12.clean(version2) === null;
    }
    _shouldPerformMigration(candidateVersion, previousMigratedVersion, versionToMigrate) {
      if (this._isVersionInRangeFormat(candidateVersion)) {
        if (previousMigratedVersion !== "0.0.0" && semver$12.satisfies(previousMigratedVersion, candidateVersion)) {
          return false;
        }
        return semver$12.satisfies(versionToMigrate, candidateVersion);
      }
      if (semver$12.lte(candidateVersion, previousMigratedVersion)) {
        return false;
      }
      if (semver$12.gt(candidateVersion, versionToMigrate)) {
        return false;
      }
      return true;
    }
    _get(key, defaultValue) {
      return dotProp$1.get(this.store, key, defaultValue);
    }
    _set(key, value) {
      const { store: store2 } = this;
      dotProp$1.set(store2, key, value);
      this.store = store2;
    }
  }
  exports.default = Conf2;
  module.exports = Conf2;
  module.exports.default = Conf2;
})(source, source.exports);
var sourceExports = source.exports;
const path = path$7;
const { app, ipcMain, ipcRenderer, shell } = require$$1$1;
const Conf = sourceExports;
let isInitialized = false;
const initDataListener = () => {
  if (!ipcMain || !app) {
    throw new Error("Electron Store: You need to call `.initRenderer()` from the main process.");
  }
  const appData = {
    defaultCwd: app.getPath("userData"),
    appVersion: app.getVersion()
  };
  if (isInitialized) {
    return appData;
  }
  ipcMain.on("electron-store-get-data", (event) => {
    event.returnValue = appData;
  });
  isInitialized = true;
  return appData;
};
class ElectronStore extends Conf {
  constructor(options) {
    let defaultCwd;
    let appVersion;
    if (ipcRenderer) {
      const appData = ipcRenderer.sendSync("electron-store-get-data");
      if (!appData) {
        throw new Error("Electron Store: You need to call `.initRenderer()` from the main process.");
      }
      ({ defaultCwd, appVersion } = appData);
    } else if (ipcMain && app) {
      ({ defaultCwd, appVersion } = initDataListener());
    }
    options = {
      name: "config",
      ...options
    };
    if (!options.projectVersion) {
      options.projectVersion = appVersion;
    }
    if (options.cwd) {
      options.cwd = path.isAbsolute(options.cwd) ? options.cwd : path.join(defaultCwd, options.cwd);
    } else {
      options.cwd = defaultCwd;
    }
    options.configName = options.name;
    delete options.name;
    super(options);
  }
  static initRenderer() {
    initDataListener();
  }
  openInEditor() {
    shell.openPath(this.path);
  }
}
var electronStore = ElectronStore;
const Store = /* @__PURE__ */ getDefaultExportFromCjs(electronStore);
const DEFAULT_ALLOWED_DIR_KEYS = [
  "userData",
  "documents",
  "downloads",
  "desktop",
  "temp"
];
let allowedDirs = [];
let userAuthorizedDirs = [];
function getConfigPath() {
  return path$7.join(require$$1$1.app.getPath("userData"), "authorized-dirs.json");
}
function loadUserAuthorizedDirs() {
  const configPath = getConfigPath();
  try {
    if (fs$4.existsSync(configPath)) {
      const data = JSON.parse(fs$4.readFileSync(configPath, "utf-8"));
      return Array.isArray(data.dirs) ? data.dirs : [];
    }
  } catch (err) {
    console.error("Failed to load authorized dirs:", err);
  }
  return [];
}
function saveUserAuthorizedDirs(dirs) {
  const configPath = getConfigPath();
  try {
    fs$4.writeFileSync(configPath, JSON.stringify({ dirs }, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save authorized dirs:", err);
  }
}
function initSecurity() {
  allowedDirs = DEFAULT_ALLOWED_DIR_KEYS.map((key) => {
    try {
      return require$$1$1.app.getPath(key);
    } catch {
      return null;
    }
  }).filter(Boolean);
  userAuthorizedDirs = loadUserAuthorizedDirs();
  console.log("[Security] Initialized with allowed dirs:", allowedDirs.length);
}
function isPathAllowed(filePath) {
  if (!filePath || typeof filePath !== "string") {
    return false;
  }
  try {
    const resolvedPath = path$7.resolve(filePath);
    const allDirs = [...allowedDirs, ...userAuthorizedDirs];
    return allDirs.some((dir) => {
      const resolvedDir = path$7.resolve(dir);
      return resolvedPath === resolvedDir || resolvedPath.startsWith(resolvedDir + path$7.sep);
    });
  } catch {
    return false;
  }
}
function validateFilePath(filePath) {
  if (!isPathAllowed(filePath)) {
    throw new Error(`Access denied: ${filePath}`);
  }
  return path$7.resolve(filePath);
}
function addAuthorizedDir(dirPath) {
  try {
    const resolvedPath = path$7.resolve(dirPath);
    if (!fs$4.existsSync(resolvedPath) || !fs$4.statSync(resolvedPath).isDirectory()) {
      return false;
    }
    if (allowedDirs.includes(resolvedPath)) {
      return true;
    }
    if (userAuthorizedDirs.includes(resolvedPath)) {
      return true;
    }
    userAuthorizedDirs.push(resolvedPath);
    saveUserAuthorizedDirs(userAuthorizedDirs);
    console.log("[Security] Added authorized dir:", resolvedPath);
    return true;
  } catch (err) {
    console.error("[Security] Failed to add authorized dir:", err);
    return false;
  }
}
function removeAuthorizedDir(dirPath) {
  try {
    const resolvedPath = path$7.resolve(dirPath);
    const index = userAuthorizedDirs.indexOf(resolvedPath);
    if (index === -1) {
      return false;
    }
    userAuthorizedDirs.splice(index, 1);
    saveUserAuthorizedDirs(userAuthorizedDirs);
    console.log("[Security] Removed authorized dir:", resolvedPath);
    return true;
  } catch (err) {
    console.error("[Security] Failed to remove authorized dir:", err);
    return false;
  }
}
function getAuthorizedDirs() {
  return {
    default: [...allowedDirs],
    user: [...userAuthorizedDirs]
  };
}
function isEncryptionAvailable() {
  return require$$1$1.safeStorage.isEncryptionAvailable();
}
function encryptString(plaintext) {
  if (!isEncryptionAvailable()) {
    console.warn("[Security] Encryption not available, falling back to Base64");
    return Buffer.from(plaintext, "utf-8").toString("base64");
  }
  const encrypted = require$$1$1.safeStorage.encryptString(plaintext);
  return encrypted.toString("base64");
}
function decryptString(encryptedBase64) {
  if (!isEncryptionAvailable()) {
    return Buffer.from(encryptedBase64, "base64").toString("utf-8");
  }
  try {
    const buffer = Buffer.from(encryptedBase64, "base64");
    return require$$1$1.safeStorage.decryptString(buffer).toString();
  } catch (err) {
    console.error("[Security] Decryption failed:", err);
    return Buffer.from(encryptedBase64, "base64").toString("utf-8");
  }
}
let logFilePath = null;
function getLogFilePath() {
  if (!logFilePath) {
    logFilePath = path$7.join(require$$1$1.app.getPath("userData"), "error.log");
  }
  return logFilePath;
}
function setupErrorHandler() {
  process.on("uncaughtException", (error2) => {
    logError("Uncaught Exception", error2);
    showErrorDialog(error2);
  });
  process.on("unhandledRejection", (reason, promise) => {
    logError("Unhandled Rejection", reason);
  });
  console.log("[ErrorHandler] Initialized");
}
function logError(type2, error2) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const message = error2 instanceof Error ? error2.stack || error2.message : String(error2);
  const logEntry = `[${timestamp}] ${type2}
${message}

`;
  console.error(`[${type2}]`, error2);
  try {
    const logPath = getLogFilePath();
    fs$4.appendFileSync(logPath, logEntry, "utf-8");
  } catch (err) {
    console.error("[ErrorHandler] Failed to write log:", err);
  }
}
function showErrorDialog(error2, title2 = "错误") {
  const message = error2 instanceof Error ? error2.message : String(error2);
  require$$1$1.dialog.showMessageBox({
    type: "error",
    title: title2,
    message: "应用发生错误",
    detail: message,
    buttons: ["确定", "查看日志"],
    defaultId: 0,
    noLink: true
  }).then(({ response }) => {
    if (response === 1) {
      const logPath = getLogFilePath();
      if (fs$4.existsSync(logPath)) {
        require$$1$1.shell.openPath(logPath);
      }
    }
  }).catch(() => {
  });
}
function wrapHandler(handler, handlerName) {
  const wrapped = (...args) => {
    try {
      const result = handler(...args);
      if (result instanceof Promise) {
        return result.catch((err) => {
          logError(`IPC Error: ${handlerName}`, err);
          throw err;
        });
      }
      return result;
    } catch (err) {
      logError(`IPC Error: ${handlerName}`, err);
      throw err;
    }
  };
  return wrapped;
}
const BASE_DIR = path$7.join(require$$1$1.app.getPath("userData"), "jianyue-reader");
const COVERS_DIR = path$7.join(BASE_DIR, "covers");
const BOOKS_DIR = path$7.join(BASE_DIR, "books");
const FONTS_DIR = path$7.join(BASE_DIR, "fonts");
const AI_CACHE_DIR = path$7.join(BASE_DIR, "ai-cache");
const IMAGES_DIR = path$7.join(BASE_DIR, "images");
function ensureDir(dir) {
  if (!fs$5.existsSync(dir)) {
    fs$5.mkdirSync(dir, { recursive: true });
  }
}
function initDirs() {
  ensureDir(BASE_DIR);
  ensureDir(COVERS_DIR);
  ensureDir(BOOKS_DIR);
  ensureDir(FONTS_DIR);
  ensureDir(AI_CACHE_DIR);
}
function registerFsHandlers() {
  require$$1$1.ipcMain.handle("fs:readFileAsBuffer", wrapHandler((_event, filePath) => {
    const validPath = validateFilePath(filePath);
    const buffer = fs$4.readFileSync(validPath);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  }, "fs:readFileAsBuffer"));
  require$$1$1.ipcMain.handle("fs:readFileAsText", wrapHandler((_event, filePath) => {
    const validPath = validateFilePath(filePath);
    return fs$4.readFileSync(validPath, { encoding: "utf-8" });
  }, "fs:readFileAsText"));
  require$$1$1.ipcMain.handle("fs:checkFileExists", wrapHandler((_event, filePath) => {
    try {
      if (!isPathAllowed(filePath)) return false;
      fs$4.accessSync(filePath, fs$4.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }, "fs:checkFileExists"));
  require$$1$1.ipcMain.handle("fs:getFileName", wrapHandler((_event, filePath) => {
    return path$7.basename(filePath);
  }, "fs:getFileName"));
  require$$1$1.ipcMain.handle("fs:getFileSize", wrapHandler((_event, filePath) => {
    try {
      const validPath = validateFilePath(filePath);
      const stat = fs$4.statSync(validPath);
      return stat.size;
    } catch {
      return 0;
    }
  }, "fs:getFileSize"));
  require$$1$1.ipcMain.handle("fs:writeTextFile", wrapHandler((_event, text) => {
    const filePath = path$7.join(require$$1$1.app.getPath("downloads"), Date.now().toString() + ".txt");
    fs$4.writeFileSync(filePath, text, { encoding: "utf-8" });
    return filePath;
  }, "fs:writeTextFile"));
  require$$1$1.ipcMain.handle("fs:writeImageFile", wrapHandler((_event, base64Url) => {
    const matches = /^data:image\/([a-z]{1,20});base64,/i.exec(base64Url);
    if (!matches) return void 0;
    const filePath = path$7.join(require$$1$1.app.getPath("downloads"), Date.now().toString() + "." + matches[1]);
    fs$4.writeFileSync(filePath, base64Url.substring(matches[0].length), { encoding: "base64" });
    return filePath;
  }, "fs:writeImageFile"));
  require$$1$1.ipcMain.handle("fs:scanFolder", wrapHandler((_event, folderPath) => {
    const bookExts = /* @__PURE__ */ new Set([".epub", ".txt", ".mobi", ".azw3", ".cbz", ".cbr"]);
    const results = [];
    function walk(dir) {
      try {
        const entries = fs$4.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path$7.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else if (bookExts.has(path$7.extname(entry.name).toLowerCase())) {
            results.push(fullPath);
          }
        }
      } catch (err) {
        console.error("fs:scanFolder error:", err);
      }
    }
    walk(folderPath);
    return results;
  }, "fs:scanFolder"));
  require$$1$1.ipcMain.handle("fs:generateNextFileName", wrapHandler((_event, dirPath, prefix) => {
    try {
      const files = fs$4.readdirSync(dirPath);
      const pattern2 = new RegExp(`^${prefix.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}-?(\\d+)\\.md$`, "i");
      let maxNum = 0;
      for (const file of files) {
        const match = file.match(pattern2);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      const nextNum = String(maxNum + 1).padStart(2, "0");
      return `${prefix}-${nextNum}.md`;
    } catch {
      return `${prefix}-01.md`;
    }
  }, "fs:generateNextFileName"));
  require$$1$1.ipcMain.handle("fs:writeToFile", wrapHandler((_event, filePath, data) => {
    try {
      const dir = path$7.dirname(filePath);
      ensureDir(dir);
      fs$4.writeFileSync(filePath, data, { encoding: "utf-8" });
      return filePath;
    } catch (err) {
      console.error("writeToFile failed:", err);
      return null;
    }
  }, "fs:writeToFile"));
}
let mainWindow$2 = null;
function setMainWindow$1(win) {
  mainWindow$2 = win;
}
function registerDialogHandlers() {
  require$$1$1.ipcMain.handle("dialog:showFilePicker", wrapHandler(async () => {
    if (!mainWindow$2) return void 0;
    const result = await require$$1$1.dialog.showOpenDialog(mainWindow$2, {
      title: "选择电子书",
      filters: [
        { name: "电子书", extensions: ["epub", "txt", "mobi", "azw3", "cbz", "cbr"] },
        { name: "所有文件", extensions: ["*"] }
      ],
      properties: ["openFile", "multiSelections"]
    });
    return result.canceled ? void 0 : result.filePaths;
  }, "dialog:showFilePicker"));
  require$$1$1.ipcMain.handle("dialog:showNoteFilePicker", wrapHandler(async () => {
    if (!mainWindow$2) return void 0;
    const result = await require$$1$1.dialog.showOpenDialog(mainWindow$2, {
      title: "打开 Markdown 文件",
      filters: [
        { name: "Markdown", extensions: ["md"] },
        { name: "纯文本", extensions: ["txt"] },
        { name: "所有文件", extensions: ["*"] }
      ],
      properties: ["openFile"]
    });
    return result.canceled ? void 0 : result.filePaths;
  }, "dialog:showNoteFilePicker"));
  require$$1$1.ipcMain.handle("dialog:showImagePicker", wrapHandler(async () => {
    if (!mainWindow$2) return void 0;
    const result = await require$$1$1.dialog.showOpenDialog(mainWindow$2, {
      title: "选择封面图片",
      filters: [
        { name: "图片", extensions: ["jpg", "jpeg", "png", "gif", "webp", "bmp"] },
        { name: "所有文件", extensions: ["*"] }
      ],
      properties: ["openFile"]
    });
    return result.canceled ? void 0 : result.filePaths;
  }, "dialog:showImagePicker"));
  require$$1$1.ipcMain.handle("dialog:showFontPicker", wrapHandler(async () => {
    if (!mainWindow$2) return void 0;
    const result = await require$$1$1.dialog.showOpenDialog(mainWindow$2, {
      title: "选择字体文件",
      filters: [
        { name: "字体文件", extensions: ["ttf", "otf", "woff", "woff2"] },
        { name: "所有文件", extensions: ["*"] }
      ],
      properties: ["openFile", "multiSelections"]
    });
    return result.canceled ? void 0 : result.filePaths;
  }, "dialog:showFontPicker"));
  require$$1$1.ipcMain.handle("dialog:showFolderPicker", wrapHandler(async () => {
    if (!mainWindow$2) return void 0;
    const result = await require$$1$1.dialog.showOpenDialog(mainWindow$2, {
      title: "选择文件夹",
      properties: ["openDirectory"]
    });
    return result.canceled ? void 0 : result.filePaths[0];
  }, "dialog:showFolderPicker"));
  require$$1$1.ipcMain.handle("dialog:saveFile", wrapHandler(async (_event, defaultName, data) => {
    if (!mainWindow$2) return null;
    const result = await require$$1$1.dialog.showOpenDialog(mainWindow$2, {
      title: "选择保存位置",
      properties: ["openDirectory"]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const savePath = path$7.join(result.filePaths[0], defaultName);
    fs$4.writeFileSync(savePath, data, typeof data === "string" ? { encoding: "utf-8" } : void 0);
    return savePath;
  }, "dialog:saveFile"));
  require$$1$1.ipcMain.handle("dialog:showNoteSaveDialog", wrapHandler(async (_event, data) => {
    if (!mainWindow$2) return null;
    const defaultDir = require$$1$1.app.getPath("documents");
    let maxNum = 0;
    try {
      const files = fs$4.readdirSync(defaultDir);
      const pattern2 = /^简记-?(\d+)\.md$/i;
      for (const file of files) {
        const match2 = file.match(pattern2);
        if (match2) {
          const num = parseInt(match2[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    } catch (err) {
      logError("IPC Error", err);
    }
    const nextNum = String(maxNum + 1).padStart(2, "0");
    const defaultName = `简记-${nextNum}.md`;
    const result = await require$$1$1.dialog.showSaveDialog(mainWindow$2, {
      title: "保存简记",
      defaultPath: path$7.join(defaultDir, defaultName),
      filters: [
        { name: "Markdown", extensions: ["md"] }
      ]
    });
    if (result.canceled || !result.filePath) return null;
    let finalPath = result.filePath;
    let finalFileName = path$7.basename(finalPath);
    const match = finalFileName.match(/^(简记)-?(\d+)\.md$/i);
    if (match && fs$4.existsSync(finalPath)) {
      const dir = path$7.dirname(finalPath);
      const prefix = match[1];
      let num = parseInt(match[2], 10);
      while (fs$4.existsSync(path$7.join(dir, `${prefix}-${String(num).padStart(2, "0")}.md`))) {
        num++;
      }
      finalFileName = `${prefix}-${String(num).padStart(2, "0")}.md`;
      finalPath = path$7.join(dir, finalFileName);
    }
    fs$4.writeFileSync(finalPath, data, { encoding: "utf-8" });
    return { filePath: finalPath, fileName: finalFileName };
  }, "dialog:showNoteSaveDialog"));
}
function registerBookHandlers() {
  require$$1$1.ipcMain.handle("book:copyToCache", wrapHandler((_event, bookId, srcPath) => {
    ensureDir(BOOKS_DIR);
    const ext = path$7.extname(srcPath) || ".epub";
    const destPath = path$7.join(BOOKS_DIR, bookId + ext);
    fs$4.copyFileSync(srcPath, destPath);
    return destPath;
  }, "book:copyToCache"));
  require$$1$1.ipcMain.handle("book:deleteCached", wrapHandler((_event, filePath) => {
    try {
      if (!filePath) return;
      const resolved = path$7.resolve(filePath);
      if (!resolved.startsWith(BOOKS_DIR)) return;
      if (fs$4.existsSync(resolved)) fs$4.unlinkSync(resolved);
    } catch (err) {
      console.error("book:deleteCached error:", err);
    }
  }, "book:deleteCached"));
  require$$1$1.ipcMain.handle("book:cachedExists", wrapHandler((_event, filePath) => {
    try {
      if (!filePath) return false;
      return fs$4.existsSync(filePath);
    } catch {
      return false;
    }
  }, "book:cachedExists"));
}
var util = { exports: {} };
var constants = {
  /* The local file header */
  LOCHDR: 30,
  // LOC header size
  LOCSIG: 67324752,
  // "PK\003\004"
  LOCVER: 4,
  // version needed to extract
  LOCFLG: 6,
  // general purpose bit flag
  LOCHOW: 8,
  // compression method
  LOCTIM: 10,
  // modification time (2 bytes time, 2 bytes date)
  LOCCRC: 14,
  // uncompressed file crc-32 value
  LOCSIZ: 18,
  // compressed size
  LOCLEN: 22,
  // uncompressed size
  LOCNAM: 26,
  // filename length
  LOCEXT: 28,
  // extra field length
  /* The Data descriptor */
  EXTSIG: 134695760,
  // "PK\007\008"
  EXTHDR: 16,
  // EXT header size
  EXTCRC: 4,
  // uncompressed file crc-32 value
  EXTSIZ: 8,
  // compressed size
  EXTLEN: 12,
  // uncompressed size
  /* The central directory file header */
  CENHDR: 46,
  // CEN header size
  CENSIG: 33639248,
  // "PK\001\002"
  CENVEM: 4,
  // version made by
  CENVER: 6,
  // version needed to extract
  CENFLG: 8,
  // encrypt, decrypt flags
  CENHOW: 10,
  // compression method
  CENTIM: 12,
  // modification time (2 bytes time, 2 bytes date)
  CENCRC: 16,
  // uncompressed file crc-32 value
  CENSIZ: 20,
  // compressed size
  CENLEN: 24,
  // uncompressed size
  CENNAM: 28,
  // filename length
  CENEXT: 30,
  // extra field length
  CENCOM: 32,
  // file comment length
  CENDSK: 34,
  // volume number start
  CENATT: 36,
  // internal file attributes
  CENATX: 38,
  // external file attributes (host system dependent)
  CENOFF: 42,
  // LOC header offset
  /* The entries in the end of central directory */
  ENDHDR: 22,
  // END header size
  ENDSIG: 101010256,
  // "PK\005\006"
  ENDSUB: 8,
  // number of entries on this disk
  ENDTOT: 10,
  // total number of entries
  ENDSIZ: 12,
  // central directory size in bytes
  ENDOFF: 16,
  // offset of first CEN header
  ENDCOM: 20,
  // zip file comment length
  END64HDR: 20,
  // zip64 END header size
  END64SIG: 117853008,
  // zip64 Locator signature, "PK\006\007"
  END64START: 4,
  // number of the disk with the start of the zip64
  END64OFF: 8,
  // relative offset of the zip64 end of central directory
  END64NUMDISKS: 16,
  // total number of disks
  ZIP64SIG: 101075792,
  // zip64 signature, "PK\006\006"
  ZIP64HDR: 56,
  // zip64 record minimum size
  ZIP64LEAD: 12,
  // leading bytes at the start of the record, not counted by the value stored in ZIP64SIZE
  ZIP64SIZE: 4,
  // zip64 size of the central directory record
  ZIP64VEM: 12,
  // zip64 version made by
  ZIP64VER: 14,
  // zip64 version needed to extract
  ZIP64DSK: 16,
  // zip64 number of this disk
  ZIP64DSKDIR: 20,
  // number of the disk with the start of the record directory
  ZIP64SUB: 24,
  // number of entries on this disk
  ZIP64TOT: 32,
  // total number of entries
  ZIP64SIZB: 40,
  // zip64 central directory size in bytes
  ZIP64OFF: 48,
  // offset of start of central directory with respect to the starting disk number
  ZIP64EXTRA: 56,
  // extensible data sector
  /* Compression methods */
  STORED: 0,
  // no compression
  SHRUNK: 1,
  // shrunk
  REDUCED1: 2,
  // reduced with compression factor 1
  REDUCED2: 3,
  // reduced with compression factor 2
  REDUCED3: 4,
  // reduced with compression factor 3
  REDUCED4: 5,
  // reduced with compression factor 4
  IMPLODED: 6,
  // imploded
  // 7 reserved for Tokenizing compression algorithm
  DEFLATED: 8,
  // deflated
  ENHANCED_DEFLATED: 9,
  // enhanced deflated
  PKWARE: 10,
  // PKWare DCL imploded
  // 11 reserved by PKWARE
  BZIP2: 12,
  //  compressed using BZIP2
  // 13 reserved by PKWARE
  LZMA: 14,
  // LZMA
  // 15-17 reserved by PKWARE
  IBM_TERSE: 18,
  // compressed using IBM TERSE
  IBM_LZ77: 19,
  // IBM LZ77 z
  AES_ENCRYPT: 99,
  // WinZIP AES encryption method
  /* General purpose bit flag */
  // values can obtained with expression 2**bitnr
  FLG_ENC: 1,
  // Bit 0: encrypted file
  FLG_COMP1: 2,
  // Bit 1, compression option
  FLG_COMP2: 4,
  // Bit 2, compression option
  FLG_DESC: 8,
  // Bit 3, data descriptor
  FLG_ENH: 16,
  // Bit 4, enhanced deflating
  FLG_PATCH: 32,
  // Bit 5, indicates that the file is compressed patched data.
  FLG_STR: 64,
  // Bit 6, strong encryption (patented)
  // Bits 7-10: Currently unused.
  FLG_EFS: 2048,
  // Bit 11: Language encoding flag (EFS)
  // Bit 12: Reserved by PKWARE for enhanced compression.
  // Bit 13: encrypted the Central Directory (patented).
  // Bits 14-15: Reserved by PKWARE.
  FLG_MSK: 4096,
  // mask header values
  /* Load type */
  FILE: 2,
  BUFFER: 1,
  NONE: 0,
  /* 4.5 Extensible data fields */
  EF_ID: 0,
  EF_SIZE: 2,
  /* Header IDs */
  ID_ZIP64: 1,
  ID_AVINFO: 7,
  ID_PFS: 8,
  ID_OS2: 9,
  ID_NTFS: 10,
  ID_OPENVMS: 12,
  ID_UNIX: 13,
  ID_FORK: 14,
  ID_PATCH: 15,
  ID_X509_PKCS7: 20,
  ID_X509_CERTID_F: 21,
  ID_X509_CERTID_C: 22,
  ID_STRONGENC: 23,
  ID_RECORD_MGT: 24,
  ID_X509_PKCS7_RL: 25,
  ID_IBM1: 101,
  ID_IBM2: 102,
  ID_POSZIP: 18064,
  EF_ZIP64_OR_32: 4294967295,
  EF_ZIP64_OR_16: 65535,
  EF_ZIP64_SUNCOMP: 0,
  EF_ZIP64_SCOMP: 8,
  EF_ZIP64_RHO: 16,
  EF_ZIP64_DSN: 24
};
var errors = {};
(function(exports) {
  const errors2 = {
    /* Header error messages */
    INVALID_LOC: "Invalid LOC header (bad signature)",
    INVALID_CEN: "Invalid CEN header (bad signature)",
    INVALID_END: "Invalid END header (bad signature)",
    /* Descriptor */
    DESCRIPTOR_NOT_EXIST: "No descriptor present",
    DESCRIPTOR_UNKNOWN: "Unknown descriptor format",
    DESCRIPTOR_FAULTY: "Descriptor data is malformed",
    /* ZipEntry error messages*/
    NO_DATA: "Nothing to decompress",
    BAD_CRC: "CRC32 checksum failed {0}",
    FILE_IN_THE_WAY: "There is a file in the way: {0}",
    UNKNOWN_METHOD: "Invalid/unsupported compression method",
    /* Inflater error messages */
    AVAIL_DATA: "inflate::Available inflate data did not terminate",
    INVALID_DISTANCE: "inflate::Invalid literal/length or distance code in fixed or dynamic block",
    TO_MANY_CODES: "inflate::Dynamic block code description: too many length or distance codes",
    INVALID_REPEAT_LEN: "inflate::Dynamic block code description: repeat more than specified lengths",
    INVALID_REPEAT_FIRST: "inflate::Dynamic block code description: repeat lengths with no first length",
    INCOMPLETE_CODES: "inflate::Dynamic block code description: code lengths codes incomplete",
    INVALID_DYN_DISTANCE: "inflate::Dynamic block code description: invalid distance code lengths",
    INVALID_CODES_LEN: "inflate::Dynamic block code description: invalid literal/length code lengths",
    INVALID_STORE_BLOCK: "inflate::Stored block length did not match one's complement",
    INVALID_BLOCK_TYPE: "inflate::Invalid block type (type == 3)",
    /* ADM-ZIP error messages */
    CANT_EXTRACT_FILE: "Could not extract the file",
    CANT_OVERRIDE: "Target file already exists",
    DISK_ENTRY_TOO_LARGE: "Number of disk entries is too large",
    NO_ZIP: "No zip file was loaded",
    NO_ENTRY: "Entry doesn't exist",
    DIRECTORY_CONTENT_ERROR: "A directory cannot have content",
    FILE_NOT_FOUND: 'File not found: "{0}"',
    NOT_IMPLEMENTED: "Not implemented",
    INVALID_FILENAME: "Invalid filename",
    INVALID_FORMAT: "Invalid or unsupported zip format. No END header found",
    INVALID_PASS_PARAM: "Incompatible password parameter",
    WRONG_PASSWORD: "Wrong Password",
    /* ADM-ZIP */
    COMMENT_TOO_LONG: "Comment is too long",
    // Comment can be max 65535 bytes long (NOTE: some non-US characters may take more space)
    EXTRA_FIELD_PARSE_ERROR: "Extra field parsing error"
  };
  function E(message) {
    return function(...args) {
      if (args.length) {
        message = message.replace(/\{(\d)\}/g, (_, n) => args[n] || "");
      }
      return new Error("ADM-ZIP: " + message);
    };
  }
  for (const msg of Object.keys(errors2)) {
    exports[msg] = E(errors2[msg]);
  }
})(errors);
const fsystem = fs$4;
const pth$2 = path$7;
const Constants$3 = constants;
const Errors$1 = errors;
const isWin = typeof process === "object" && "win32" === process.platform;
const is_Obj = (obj) => typeof obj === "object" && obj !== null;
const crcTable = new Uint32Array(256).map((t2, c) => {
  for (let k = 0; k < 8; k++) {
    if ((c & 1) !== 0) {
      c = 3988292384 ^ c >>> 1;
    } else {
      c >>>= 1;
    }
  }
  return c >>> 0;
});
function Utils$5(opts) {
  this.sep = pth$2.sep;
  this.fs = fsystem;
  if (is_Obj(opts)) {
    if (is_Obj(opts.fs) && typeof opts.fs.statSync === "function") {
      this.fs = opts.fs;
    }
  }
}
var utils = Utils$5;
Utils$5.prototype.makeDir = function(folder) {
  const self2 = this;
  function mkdirSync(fpath) {
    let resolvedPath = fpath.split(self2.sep)[0];
    fpath.split(self2.sep).forEach(function(name) {
      if (!name || name.substr(-1, 1) === ":") return;
      resolvedPath += self2.sep + name;
      var stat;
      try {
        stat = self2.fs.statSync(resolvedPath);
      } catch (e) {
        if (e.message && e.message.startsWith("ENOENT")) {
          self2.fs.mkdirSync(resolvedPath);
        } else {
          throw e;
        }
      }
      if (stat && stat.isFile()) throw Errors$1.FILE_IN_THE_WAY(`"${resolvedPath}"`);
    });
  }
  mkdirSync(folder);
};
Utils$5.prototype.writeFileTo = function(path2, content, overwrite, attr) {
  const self2 = this;
  if (self2.fs.existsSync(path2)) {
    if (!overwrite) return false;
    var stat = self2.fs.statSync(path2);
    if (stat.isDirectory()) {
      return false;
    }
  }
  var folder = pth$2.dirname(path2);
  if (!self2.fs.existsSync(folder)) {
    self2.makeDir(folder);
  }
  var fd;
  try {
    fd = self2.fs.openSync(path2, "w", 438);
  } catch (e) {
    self2.fs.chmodSync(path2, 438);
    fd = self2.fs.openSync(path2, "w", 438);
  }
  if (fd) {
    try {
      self2.fs.writeSync(fd, content, 0, content.length, 0);
    } finally {
      self2.fs.closeSync(fd);
    }
  }
  self2.fs.chmodSync(path2, attr || 438);
  return true;
};
Utils$5.prototype.writeFileToAsync = function(path2, content, overwrite, attr, callback) {
  if (typeof attr === "function") {
    callback = attr;
    attr = void 0;
  }
  const self2 = this;
  self2.fs.exists(path2, function(exist) {
    if (exist && !overwrite) return callback(false);
    self2.fs.stat(path2, function(err, stat) {
      if (exist && stat.isDirectory()) {
        return callback(false);
      }
      var folder = pth$2.dirname(path2);
      self2.fs.exists(folder, function(exists) {
        if (!exists) self2.makeDir(folder);
        self2.fs.open(path2, "w", 438, function(err2, fd) {
          if (err2) {
            self2.fs.chmod(path2, 438, function() {
              self2.fs.open(path2, "w", 438, function(err3, fd2) {
                self2.fs.write(fd2, content, 0, content.length, 0, function() {
                  self2.fs.close(fd2, function() {
                    self2.fs.chmod(path2, attr || 438, function() {
                      callback(true);
                    });
                  });
                });
              });
            });
          } else if (fd) {
            self2.fs.write(fd, content, 0, content.length, 0, function() {
              self2.fs.close(fd, function() {
                self2.fs.chmod(path2, attr || 438, function() {
                  callback(true);
                });
              });
            });
          } else {
            self2.fs.chmod(path2, attr || 438, function() {
              callback(true);
            });
          }
        });
      });
    });
  });
};
Utils$5.prototype.findFiles = function(path2) {
  const self2 = this;
  function findSync(dir, pattern2, recursive) {
    let files = [];
    self2.fs.readdirSync(dir).forEach(function(file) {
      const path3 = pth$2.join(dir, file);
      const stat = self2.fs.statSync(path3);
      {
        files.push(pth$2.normalize(path3) + (stat.isDirectory() ? self2.sep : ""));
      }
      if (stat.isDirectory() && recursive) files = files.concat(findSync(path3, pattern2, recursive));
    });
    return files;
  }
  return findSync(path2, void 0, true);
};
Utils$5.prototype.findFilesAsync = function(dir, cb) {
  const self2 = this;
  let results = [];
  self2.fs.readdir(dir, function(err, list) {
    if (err) return cb(err);
    let list_length = list.length;
    if (!list_length) return cb(null, results);
    list.forEach(function(file) {
      file = pth$2.join(dir, file);
      self2.fs.stat(file, function(err2, stat) {
        if (err2) return cb(err2);
        if (stat) {
          results.push(pth$2.normalize(file) + (stat.isDirectory() ? self2.sep : ""));
          if (stat.isDirectory()) {
            self2.findFilesAsync(file, function(err3, res) {
              if (err3) return cb(err3);
              results = results.concat(res);
              if (!--list_length) cb(null, results);
            });
          } else {
            if (!--list_length) cb(null, results);
          }
        }
      });
    });
  });
};
Utils$5.prototype.getAttributes = function() {
};
Utils$5.prototype.setAttributes = function() {
};
Utils$5.crc32update = function(crc, byte) {
  return crcTable[(crc ^ byte) & 255] ^ crc >>> 8;
};
Utils$5.crc32 = function(buf) {
  if (typeof buf === "string") {
    buf = Buffer.from(buf, "utf8");
  }
  let len = buf.length;
  let crc = -1;
  for (let off = 0; off < len; ) crc = Utils$5.crc32update(crc, buf[off++]);
  return ~crc >>> 0;
};
Utils$5.methodToString = function(method) {
  switch (method) {
    case Constants$3.STORED:
      return "STORED (" + method + ")";
    case Constants$3.DEFLATED:
      return "DEFLATED (" + method + ")";
    default:
      return "UNSUPPORTED (" + method + ")";
  }
};
Utils$5.canonical = function(path2) {
  if (!path2) return "";
  const safeSuffix = pth$2.posix.normalize("/" + path2.split("\\").join("/"));
  return pth$2.join(".", safeSuffix);
};
Utils$5.zipnamefix = function(path2) {
  if (!path2) return "";
  const safeSuffix = pth$2.posix.normalize("/" + path2.split("\\").join("/"));
  return pth$2.posix.join(".", safeSuffix);
};
Utils$5.findLast = function(arr, callback) {
  if (!Array.isArray(arr)) throw new TypeError("arr is not array");
  const len = arr.length >>> 0;
  for (let i = len - 1; i >= 0; i--) {
    if (callback(arr[i], i, arr)) {
      return arr[i];
    }
  }
  return void 0;
};
Utils$5.sanitize = function(prefix, name) {
  prefix = pth$2.resolve(pth$2.normalize(prefix));
  var parts = name.split("/");
  for (var i = 0, l = parts.length; i < l; i++) {
    var path2 = pth$2.normalize(pth$2.join(prefix, parts.slice(i, l).join(pth$2.sep)));
    if (path2.indexOf(prefix) === 0) {
      return path2;
    }
  }
  return pth$2.normalize(pth$2.join(prefix, pth$2.basename(name)));
};
Utils$5.toBuffer = function toBuffer(input, encoder) {
  if (Buffer.isBuffer(input)) {
    return input;
  } else if (input instanceof Uint8Array) {
    return Buffer.from(input);
  } else {
    return typeof input === "string" ? encoder(input) : Buffer.alloc(0);
  }
};
Utils$5.readBigUInt64LE = function(buffer, index) {
  const lo = buffer.readUInt32LE(index);
  const hi = buffer.readUInt32LE(index + 4);
  return hi * 4294967296 + lo;
};
Utils$5.fromDOS2Date = function(val) {
  return new Date((val >> 25 & 127) + 1980, Math.max((val >> 21 & 15) - 1, 0), Math.max(val >> 16 & 31, 1), val >> 11 & 31, val >> 5 & 63, (val & 31) << 1);
};
Utils$5.fromDate2DOS = function(val) {
  let date = 0;
  let time = 0;
  if (val.getFullYear() > 1979) {
    date = (val.getFullYear() - 1980 & 127) << 9 | val.getMonth() + 1 << 5 | val.getDate();
    time = val.getHours() << 11 | val.getMinutes() << 5 | val.getSeconds() >> 1;
  }
  return date << 16 | time;
};
Utils$5.isWin = isWin;
Utils$5.crcTable = crcTable;
const pth$1 = path$7;
var fattr = function(path2, { fs: fs2 }) {
  var _path = path2 || "", _obj = newAttr(), _stat = null;
  function newAttr() {
    return {
      directory: false,
      readonly: false,
      hidden: false,
      executable: false,
      mtime: 0,
      atime: 0
    };
  }
  if (_path && fs2.existsSync(_path)) {
    _stat = fs2.statSync(_path);
    _obj.directory = _stat.isDirectory();
    _obj.mtime = _stat.mtime;
    _obj.atime = _stat.atime;
    _obj.executable = (73 & _stat.mode) !== 0;
    _obj.readonly = (128 & _stat.mode) === 0;
    _obj.hidden = pth$1.basename(_path)[0] === ".";
  } else {
    console.warn("Invalid path: " + _path);
  }
  return {
    get directory() {
      return _obj.directory;
    },
    get readOnly() {
      return _obj.readonly;
    },
    get hidden() {
      return _obj.hidden;
    },
    get mtime() {
      return _obj.mtime;
    },
    get atime() {
      return _obj.atime;
    },
    get executable() {
      return _obj.executable;
    },
    decodeAttributes: function() {
    },
    encodeAttributes: function() {
    },
    toJSON: function() {
      return {
        path: _path,
        isDirectory: _obj.directory,
        isReadOnly: _obj.readonly,
        isHidden: _obj.hidden,
        isExecutable: _obj.executable,
        mTime: _obj.mtime,
        aTime: _obj.atime
      };
    },
    toString: function() {
      return JSON.stringify(this.toJSON(), null, "	");
    }
  };
};
var decoder = {
  efs: true,
  encode: (data) => Buffer.from(data, "utf8"),
  decode: (data) => data.toString("utf8")
};
util.exports = utils;
util.exports.Constants = constants;
util.exports.Errors = errors;
util.exports.FileAttr = fattr;
util.exports.decoder = decoder;
var utilExports = util.exports;
var headers = {};
var Utils$4 = utilExports, Constants$2 = Utils$4.Constants;
var entryHeader = function() {
  var _verMade = 20, _version = 10, _flags = 0, _method = 0, _time = 0, _crc = 0, _compressedSize = 0, _size = 0, _fnameLen = 0, _extraLen = 0, _comLen = 0, _diskStart = 0, _inattr = 0, _attr = 0, _offset = 0;
  _verMade |= Utils$4.isWin ? 2560 : 768;
  _flags |= Constants$2.FLG_EFS;
  const _localHeader = {
    extraLen: 0
  };
  const uint32 = (val) => Math.max(0, val) >>> 0;
  const uint8 = (val) => Math.max(0, val) & 255;
  _time = Utils$4.fromDate2DOS(/* @__PURE__ */ new Date());
  return {
    get made() {
      return _verMade;
    },
    set made(val) {
      _verMade = val;
    },
    get version() {
      return _version;
    },
    set version(val) {
      _version = val;
    },
    get flags() {
      return _flags;
    },
    set flags(val) {
      _flags = val;
    },
    get flags_efs() {
      return (_flags & Constants$2.FLG_EFS) > 0;
    },
    set flags_efs(val) {
      if (val) {
        _flags |= Constants$2.FLG_EFS;
      } else {
        _flags &= ~Constants$2.FLG_EFS;
      }
    },
    get flags_desc() {
      return (_flags & Constants$2.FLG_DESC) > 0;
    },
    set flags_desc(val) {
      if (val) {
        _flags |= Constants$2.FLG_DESC;
      } else {
        _flags &= ~Constants$2.FLG_DESC;
      }
    },
    get method() {
      return _method;
    },
    set method(val) {
      switch (val) {
        case Constants$2.STORED:
          this.version = 10;
        case Constants$2.DEFLATED:
        default:
          this.version = 20;
      }
      _method = val;
    },
    get time() {
      return Utils$4.fromDOS2Date(this.timeval);
    },
    set time(val) {
      val = new Date(val);
      this.timeval = Utils$4.fromDate2DOS(val);
    },
    get timeval() {
      return _time;
    },
    set timeval(val) {
      _time = uint32(val);
    },
    get timeHighByte() {
      return uint8(_time >>> 8);
    },
    get crc() {
      return _crc;
    },
    set crc(val) {
      _crc = uint32(val);
    },
    get compressedSize() {
      return _compressedSize;
    },
    set compressedSize(val) {
      _compressedSize = uint32(val);
    },
    get size() {
      return _size;
    },
    set size(val) {
      _size = uint32(val);
    },
    get fileNameLength() {
      return _fnameLen;
    },
    set fileNameLength(val) {
      _fnameLen = val;
    },
    get extraLength() {
      return _extraLen;
    },
    set extraLength(val) {
      _extraLen = val;
    },
    get extraLocalLength() {
      return _localHeader.extraLen;
    },
    set extraLocalLength(val) {
      _localHeader.extraLen = val;
    },
    get commentLength() {
      return _comLen;
    },
    set commentLength(val) {
      _comLen = val;
    },
    get diskNumStart() {
      return _diskStart;
    },
    set diskNumStart(val) {
      _diskStart = uint32(val);
    },
    get inAttr() {
      return _inattr;
    },
    set inAttr(val) {
      _inattr = uint32(val);
    },
    get attr() {
      return _attr;
    },
    set attr(val) {
      _attr = uint32(val);
    },
    // get Unix file permissions
    get fileAttr() {
      return (_attr || 0) >> 16 & 4095;
    },
    get offset() {
      return _offset;
    },
    set offset(val) {
      _offset = uint32(val);
    },
    get encrypted() {
      return (_flags & Constants$2.FLG_ENC) === Constants$2.FLG_ENC;
    },
    get centralHeaderSize() {
      return Constants$2.CENHDR + _fnameLen + _extraLen + _comLen;
    },
    get realDataOffset() {
      return _offset + Constants$2.LOCHDR + _localHeader.fnameLen + _localHeader.extraLen;
    },
    get localHeader() {
      return _localHeader;
    },
    loadLocalHeaderFromBinary: function(input) {
      var data = input.slice(_offset, _offset + Constants$2.LOCHDR);
      if (data.readUInt32LE(0) !== Constants$2.LOCSIG) {
        throw Utils$4.Errors.INVALID_LOC();
      }
      _localHeader.version = data.readUInt16LE(Constants$2.LOCVER);
      _localHeader.flags = data.readUInt16LE(Constants$2.LOCFLG);
      _localHeader.flags_desc = (_localHeader.flags & Constants$2.FLG_DESC) > 0;
      _localHeader.method = data.readUInt16LE(Constants$2.LOCHOW);
      _localHeader.time = data.readUInt32LE(Constants$2.LOCTIM);
      _localHeader.crc = data.readUInt32LE(Constants$2.LOCCRC);
      _localHeader.compressedSize = data.readUInt32LE(Constants$2.LOCSIZ);
      _localHeader.size = data.readUInt32LE(Constants$2.LOCLEN);
      _localHeader.fnameLen = data.readUInt16LE(Constants$2.LOCNAM);
      _localHeader.extraLen = data.readUInt16LE(Constants$2.LOCEXT);
      const extraStart = _offset + Constants$2.LOCHDR + _localHeader.fnameLen;
      const extraEnd = extraStart + _localHeader.extraLen;
      return input.slice(extraStart, extraEnd);
    },
    loadFromBinary: function(data) {
      if (data.length !== Constants$2.CENHDR || data.readUInt32LE(0) !== Constants$2.CENSIG) {
        throw Utils$4.Errors.INVALID_CEN();
      }
      _verMade = data.readUInt16LE(Constants$2.CENVEM);
      _version = data.readUInt16LE(Constants$2.CENVER);
      _flags = data.readUInt16LE(Constants$2.CENFLG);
      _method = data.readUInt16LE(Constants$2.CENHOW);
      _time = data.readUInt32LE(Constants$2.CENTIM);
      _crc = data.readUInt32LE(Constants$2.CENCRC);
      _compressedSize = data.readUInt32LE(Constants$2.CENSIZ);
      _size = data.readUInt32LE(Constants$2.CENLEN);
      _fnameLen = data.readUInt16LE(Constants$2.CENNAM);
      _extraLen = data.readUInt16LE(Constants$2.CENEXT);
      _comLen = data.readUInt16LE(Constants$2.CENCOM);
      _diskStart = data.readUInt16LE(Constants$2.CENDSK);
      _inattr = data.readUInt16LE(Constants$2.CENATT);
      _attr = data.readUInt32LE(Constants$2.CENATX);
      _offset = data.readUInt32LE(Constants$2.CENOFF);
    },
    localHeaderToBinary: function() {
      var data = Buffer.alloc(Constants$2.LOCHDR);
      data.writeUInt32LE(Constants$2.LOCSIG, 0);
      data.writeUInt16LE(_version, Constants$2.LOCVER);
      data.writeUInt16LE(_flags, Constants$2.LOCFLG);
      data.writeUInt16LE(_method, Constants$2.LOCHOW);
      data.writeUInt32LE(_time, Constants$2.LOCTIM);
      data.writeUInt32LE(_crc, Constants$2.LOCCRC);
      data.writeUInt32LE(_compressedSize, Constants$2.LOCSIZ);
      data.writeUInt32LE(_size, Constants$2.LOCLEN);
      data.writeUInt16LE(_fnameLen, Constants$2.LOCNAM);
      data.writeUInt16LE(_localHeader.extraLen, Constants$2.LOCEXT);
      return data;
    },
    centralHeaderToBinary: function() {
      var data = Buffer.alloc(Constants$2.CENHDR + _fnameLen + _extraLen + _comLen);
      data.writeUInt32LE(Constants$2.CENSIG, 0);
      data.writeUInt16LE(_verMade, Constants$2.CENVEM);
      data.writeUInt16LE(_version, Constants$2.CENVER);
      data.writeUInt16LE(_flags, Constants$2.CENFLG);
      data.writeUInt16LE(_method, Constants$2.CENHOW);
      data.writeUInt32LE(_time, Constants$2.CENTIM);
      data.writeUInt32LE(_crc, Constants$2.CENCRC);
      data.writeUInt32LE(_compressedSize, Constants$2.CENSIZ);
      data.writeUInt32LE(_size, Constants$2.CENLEN);
      data.writeUInt16LE(_fnameLen, Constants$2.CENNAM);
      data.writeUInt16LE(_extraLen, Constants$2.CENEXT);
      data.writeUInt16LE(_comLen, Constants$2.CENCOM);
      data.writeUInt16LE(_diskStart, Constants$2.CENDSK);
      data.writeUInt16LE(_inattr, Constants$2.CENATT);
      data.writeUInt32LE(_attr, Constants$2.CENATX);
      data.writeUInt32LE(_offset, Constants$2.CENOFF);
      return data;
    },
    toJSON: function() {
      const bytes = function(nr) {
        return nr + " bytes";
      };
      return {
        made: _verMade,
        version: _version,
        flags: _flags,
        method: Utils$4.methodToString(_method),
        time: this.time,
        crc: "0x" + _crc.toString(16).toUpperCase(),
        compressedSize: bytes(_compressedSize),
        size: bytes(_size),
        fileNameLength: bytes(_fnameLen),
        extraLength: bytes(_extraLen),
        commentLength: bytes(_comLen),
        diskNumStart: _diskStart,
        inAttr: _inattr,
        attr: _attr,
        offset: _offset,
        centralHeaderSize: bytes(Constants$2.CENHDR + _fnameLen + _extraLen + _comLen)
      };
    },
    toString: function() {
      return JSON.stringify(this.toJSON(), null, "	");
    }
  };
};
var Utils$3 = utilExports, Constants$1 = Utils$3.Constants;
var mainHeader = function() {
  var _volumeEntries = 0, _totalEntries = 0, _size = 0, _offset = 0, _commentLength = 0;
  return {
    get diskEntries() {
      return _volumeEntries;
    },
    set diskEntries(val) {
      _volumeEntries = _totalEntries = val;
    },
    get totalEntries() {
      return _totalEntries;
    },
    set totalEntries(val) {
      _totalEntries = _volumeEntries = val;
    },
    get size() {
      return _size;
    },
    set size(val) {
      _size = val;
    },
    get offset() {
      return _offset;
    },
    set offset(val) {
      _offset = val;
    },
    get commentLength() {
      return _commentLength;
    },
    set commentLength(val) {
      _commentLength = val;
    },
    get mainHeaderSize() {
      return Constants$1.ENDHDR + _commentLength;
    },
    loadFromBinary: function(data) {
      if ((data.length !== Constants$1.ENDHDR || data.readUInt32LE(0) !== Constants$1.ENDSIG) && (data.length < Constants$1.ZIP64HDR || data.readUInt32LE(0) !== Constants$1.ZIP64SIG)) {
        throw Utils$3.Errors.INVALID_END();
      }
      if (data.readUInt32LE(0) === Constants$1.ENDSIG) {
        _volumeEntries = data.readUInt16LE(Constants$1.ENDSUB);
        _totalEntries = data.readUInt16LE(Constants$1.ENDTOT);
        _size = data.readUInt32LE(Constants$1.ENDSIZ);
        _offset = data.readUInt32LE(Constants$1.ENDOFF);
        _commentLength = data.readUInt16LE(Constants$1.ENDCOM);
      } else {
        _volumeEntries = Utils$3.readBigUInt64LE(data, Constants$1.ZIP64SUB);
        _totalEntries = Utils$3.readBigUInt64LE(data, Constants$1.ZIP64TOT);
        _size = Utils$3.readBigUInt64LE(data, Constants$1.ZIP64SIZE);
        _offset = Utils$3.readBigUInt64LE(data, Constants$1.ZIP64OFF);
        _commentLength = 0;
      }
    },
    toBinary: function() {
      var b = Buffer.alloc(Constants$1.ENDHDR + _commentLength);
      b.writeUInt32LE(Constants$1.ENDSIG, 0);
      b.writeUInt32LE(0, 4);
      b.writeUInt16LE(_volumeEntries, Constants$1.ENDSUB);
      b.writeUInt16LE(_totalEntries, Constants$1.ENDTOT);
      b.writeUInt32LE(_size, Constants$1.ENDSIZ);
      b.writeUInt32LE(_offset, Constants$1.ENDOFF);
      b.writeUInt16LE(_commentLength, Constants$1.ENDCOM);
      b.fill(" ", Constants$1.ENDHDR);
      return b;
    },
    toJSON: function() {
      const offset = function(nr, len) {
        let offs = nr.toString(16).toUpperCase();
        while (offs.length < len) offs = "0" + offs;
        return "0x" + offs;
      };
      return {
        diskEntries: _volumeEntries,
        totalEntries: _totalEntries,
        size: _size + " bytes",
        offset: offset(_offset, 4),
        commentLength: _commentLength
      };
    },
    toString: function() {
      return JSON.stringify(this.toJSON(), null, "	");
    }
  };
};
headers.EntryHeader = entryHeader;
headers.MainHeader = mainHeader;
var methods = {};
var deflater = function(inbuf) {
  var zlib = require$$0;
  var opts = { chunkSize: (parseInt(inbuf.length / 1024) + 1) * 1024 };
  return {
    deflate: function() {
      return zlib.deflateRawSync(inbuf, opts);
    },
    deflateAsync: function(callback) {
      var tmp = zlib.createDeflateRaw(opts), parts = [], total = 0;
      tmp.on("data", function(data) {
        parts.push(data);
        total += data.length;
      });
      tmp.on("end", function() {
        var buf = Buffer.alloc(total), written = 0;
        buf.fill(0);
        for (var i = 0; i < parts.length; i++) {
          var part = parts[i];
          part.copy(buf, written);
          written += part.length;
        }
        callback && callback(buf);
      });
      tmp.end(inbuf);
    }
  };
};
const version = +(process.versions ? process.versions.node : "").split(".")[0] || 0;
var inflater = function(inbuf, expectedLength) {
  var zlib = require$$0;
  const option = version >= 15 && expectedLength > 0 ? { maxOutputLength: expectedLength } : {};
  return {
    inflate: function() {
      return zlib.inflateRawSync(inbuf, option);
    },
    inflateAsync: function(callback) {
      var tmp = zlib.createInflateRaw(option), parts = [], total = 0;
      tmp.on("data", function(data) {
        parts.push(data);
        total += data.length;
      });
      tmp.on("end", function() {
        var buf = Buffer.alloc(total), written = 0;
        buf.fill(0);
        for (var i = 0; i < parts.length; i++) {
          var part = parts[i];
          part.copy(buf, written);
          written += part.length;
        }
        callback && callback(buf);
      });
      tmp.end(inbuf);
    }
  };
};
const { randomFillSync } = require$$2$1;
const Errors = errors;
const crctable = new Uint32Array(256).map((t2, crc) => {
  for (let j = 0; j < 8; j++) {
    if (0 !== (crc & 1)) {
      crc = crc >>> 1 ^ 3988292384;
    } else {
      crc >>>= 1;
    }
  }
  return crc >>> 0;
});
const uMul = (a, b) => Math.imul(a, b) >>> 0;
const crc32update = (pCrc32, bval) => {
  return crctable[(pCrc32 ^ bval) & 255] ^ pCrc32 >>> 8;
};
const genSalt = () => {
  if ("function" === typeof randomFillSync) {
    return randomFillSync(Buffer.alloc(12));
  } else {
    return genSalt.node();
  }
};
genSalt.node = () => {
  const salt = Buffer.alloc(12);
  const len = salt.length;
  for (let i = 0; i < len; i++) salt[i] = Math.random() * 256 & 255;
  return salt;
};
const config = {
  genSalt
};
function Initkeys(pw) {
  const pass = Buffer.isBuffer(pw) ? pw : Buffer.from(pw);
  this.keys = new Uint32Array([305419896, 591751049, 878082192]);
  for (let i = 0; i < pass.length; i++) {
    this.updateKeys(pass[i]);
  }
}
Initkeys.prototype.updateKeys = function(byteValue) {
  const keys = this.keys;
  keys[0] = crc32update(keys[0], byteValue);
  keys[1] += keys[0] & 255;
  keys[1] = uMul(keys[1], 134775813) + 1;
  keys[2] = crc32update(keys[2], keys[1] >>> 24);
  return byteValue;
};
Initkeys.prototype.next = function() {
  const k = (this.keys[2] | 2) >>> 0;
  return uMul(k, k ^ 1) >> 8 & 255;
};
function make_decrypter(pwd) {
  const keys = new Initkeys(pwd);
  return function(data) {
    const result = Buffer.alloc(data.length);
    let pos = 0;
    for (let c of data) {
      result[pos++] = keys.updateKeys(c ^ keys.next());
    }
    return result;
  };
}
function make_encrypter(pwd) {
  const keys = new Initkeys(pwd);
  return function(data, result, pos = 0) {
    if (!result) result = Buffer.alloc(data.length);
    for (let c of data) {
      const k = keys.next();
      result[pos++] = c ^ k;
      keys.updateKeys(c);
    }
    return result;
  };
}
function decrypt(data, header, pwd) {
  if (!data || !Buffer.isBuffer(data) || data.length < 12) {
    return Buffer.alloc(0);
  }
  const decrypter = make_decrypter(pwd);
  const salt = decrypter(data.slice(0, 12));
  const verifyByte = (header.flags & 8) === 8 ? header.timeHighByte : header.crc >>> 24;
  if (salt[11] !== verifyByte) {
    throw Errors.WRONG_PASSWORD();
  }
  return decrypter(data.slice(12));
}
function _salter(data) {
  if (Buffer.isBuffer(data) && data.length >= 12) {
    config.genSalt = function() {
      return data.slice(0, 12);
    };
  } else if (data === "node") {
    config.genSalt = genSalt.node;
  } else {
    config.genSalt = genSalt;
  }
}
function encrypt(data, header, pwd, oldlike = false) {
  if (data == null) data = Buffer.alloc(0);
  if (!Buffer.isBuffer(data)) data = Buffer.from(data.toString());
  const encrypter = make_encrypter(pwd);
  const salt = config.genSalt();
  salt[11] = header.crc >>> 24 & 255;
  if (oldlike) salt[10] = header.crc >>> 16 & 255;
  const result = Buffer.alloc(data.length + 12);
  encrypter(salt, result);
  return encrypter(data, result, 12);
}
var zipcrypto = { decrypt, encrypt, _salter };
methods.Deflater = deflater;
methods.Inflater = inflater;
methods.ZipCrypto = zipcrypto;
var Utils$2 = utilExports, Headers$1 = headers, Constants = Utils$2.Constants, Methods = methods;
var zipEntry = function(options, input) {
  var _centralHeader = new Headers$1.EntryHeader(), _entryName = Buffer.alloc(0), _comment = Buffer.alloc(0), _isDirectory = false, uncompressedData = null, _extra = Buffer.alloc(0), _extralocal = Buffer.alloc(0), _efs = true;
  const opts = options;
  const decoder2 = typeof opts.decoder === "object" ? opts.decoder : Utils$2.decoder;
  _efs = decoder2.hasOwnProperty("efs") ? decoder2.efs : false;
  function getCompressedDataFromZip() {
    if (!input || !(input instanceof Uint8Array)) {
      return Buffer.alloc(0);
    }
    _extralocal = _centralHeader.loadLocalHeaderFromBinary(input);
    return input.slice(_centralHeader.realDataOffset, _centralHeader.realDataOffset + _centralHeader.compressedSize);
  }
  function crc32OK(data) {
    if (!_centralHeader.flags_desc && !_centralHeader.localHeader.flags_desc) {
      if (Utils$2.crc32(data) !== _centralHeader.localHeader.crc) {
        return false;
      }
    } else {
      const descriptor = {};
      const dataEndOffset = _centralHeader.realDataOffset + _centralHeader.compressedSize;
      if (input.readUInt32LE(dataEndOffset) == Constants.LOCSIG || input.readUInt32LE(dataEndOffset) == Constants.CENSIG) {
        throw Utils$2.Errors.DESCRIPTOR_NOT_EXIST();
      }
      if (input.readUInt32LE(dataEndOffset) == Constants.EXTSIG) {
        descriptor.crc = input.readUInt32LE(dataEndOffset + Constants.EXTCRC);
        descriptor.compressedSize = input.readUInt32LE(dataEndOffset + Constants.EXTSIZ);
        descriptor.size = input.readUInt32LE(dataEndOffset + Constants.EXTLEN);
      } else if (input.readUInt16LE(dataEndOffset + 12) === 19280) {
        descriptor.crc = input.readUInt32LE(dataEndOffset + Constants.EXTCRC - 4);
        descriptor.compressedSize = input.readUInt32LE(dataEndOffset + Constants.EXTSIZ - 4);
        descriptor.size = input.readUInt32LE(dataEndOffset + Constants.EXTLEN - 4);
      } else {
        throw Utils$2.Errors.DESCRIPTOR_UNKNOWN();
      }
      if (descriptor.compressedSize !== _centralHeader.compressedSize || descriptor.size !== _centralHeader.size || descriptor.crc !== _centralHeader.crc) {
        throw Utils$2.Errors.DESCRIPTOR_FAULTY();
      }
      if (Utils$2.crc32(data) !== descriptor.crc) {
        return false;
      }
    }
    return true;
  }
  function decompress(async, callback, pass) {
    if (typeof callback === "undefined" && typeof async === "string") {
      pass = async;
      async = void 0;
    }
    if (_isDirectory) {
      if (async && callback) {
        callback(Buffer.alloc(0), Utils$2.Errors.DIRECTORY_CONTENT_ERROR());
      }
      return Buffer.alloc(0);
    }
    var compressedData = getCompressedDataFromZip();
    if (compressedData.length === 0) {
      if (async && callback) callback(compressedData);
      return compressedData;
    }
    if (_centralHeader.encrypted) {
      if ("string" !== typeof pass && !Buffer.isBuffer(pass)) {
        throw Utils$2.Errors.INVALID_PASS_PARAM();
      }
      compressedData = Methods.ZipCrypto.decrypt(compressedData, _centralHeader, pass);
    }
    var data = Buffer.alloc(_centralHeader.size);
    switch (_centralHeader.method) {
      case Utils$2.Constants.STORED:
        compressedData.copy(data);
        if (!crc32OK(data)) {
          if (async && callback) callback(data, Utils$2.Errors.BAD_CRC());
          throw Utils$2.Errors.BAD_CRC();
        } else {
          if (async && callback) callback(data);
          return data;
        }
      case Utils$2.Constants.DEFLATED:
        var inflater2 = new Methods.Inflater(compressedData, _centralHeader.size);
        if (!async) {
          const result = inflater2.inflate(data);
          result.copy(data, 0);
          if (!crc32OK(data)) {
            throw Utils$2.Errors.BAD_CRC(`"${decoder2.decode(_entryName)}"`);
          }
          return data;
        } else {
          inflater2.inflateAsync(function(result) {
            result.copy(result, 0);
            if (callback) {
              if (!crc32OK(result)) {
                callback(result, Utils$2.Errors.BAD_CRC());
              } else {
                callback(result);
              }
            }
          });
        }
        break;
      default:
        if (async && callback) callback(Buffer.alloc(0), Utils$2.Errors.UNKNOWN_METHOD());
        throw Utils$2.Errors.UNKNOWN_METHOD();
    }
  }
  function compress(async, callback) {
    if ((!uncompressedData || !uncompressedData.length) && Buffer.isBuffer(input)) {
      if (async && callback) callback(getCompressedDataFromZip());
      return getCompressedDataFromZip();
    }
    if (uncompressedData.length && !_isDirectory) {
      var compressedData;
      switch (_centralHeader.method) {
        case Utils$2.Constants.STORED:
          _centralHeader.compressedSize = _centralHeader.size;
          compressedData = Buffer.alloc(uncompressedData.length);
          uncompressedData.copy(compressedData);
          if (async && callback) callback(compressedData);
          return compressedData;
        default:
        case Utils$2.Constants.DEFLATED:
          var deflater2 = new Methods.Deflater(uncompressedData);
          if (!async) {
            var deflated = deflater2.deflate();
            _centralHeader.compressedSize = deflated.length;
            return deflated;
          } else {
            deflater2.deflateAsync(function(data) {
              compressedData = Buffer.alloc(data.length);
              _centralHeader.compressedSize = data.length;
              data.copy(compressedData);
              callback && callback(compressedData);
            });
          }
          deflater2 = null;
          break;
      }
    } else if (async && callback) {
      callback(Buffer.alloc(0));
    } else {
      return Buffer.alloc(0);
    }
  }
  function readUInt64LE(buffer, offset) {
    return Utils$2.readBigUInt64LE(buffer, offset);
  }
  function parseExtra(data) {
    try {
      var offset = 0;
      var signature, size, part;
      while (offset + 4 < data.length) {
        signature = data.readUInt16LE(offset);
        offset += 2;
        size = data.readUInt16LE(offset);
        offset += 2;
        part = data.slice(offset, offset + size);
        offset += size;
        if (Constants.ID_ZIP64 === signature) {
          parseZip64ExtendedInformation(part);
        }
      }
    } catch (error2) {
      throw Utils$2.Errors.EXTRA_FIELD_PARSE_ERROR();
    }
  }
  function parseZip64ExtendedInformation(data) {
    var size, compressedSize, offset, diskNumStart;
    if (data.length >= Constants.EF_ZIP64_SCOMP) {
      size = readUInt64LE(data, Constants.EF_ZIP64_SUNCOMP);
      if (_centralHeader.size === Constants.EF_ZIP64_OR_32) {
        _centralHeader.size = size;
      }
    }
    if (data.length >= Constants.EF_ZIP64_RHO) {
      compressedSize = readUInt64LE(data, Constants.EF_ZIP64_SCOMP);
      if (_centralHeader.compressedSize === Constants.EF_ZIP64_OR_32) {
        _centralHeader.compressedSize = compressedSize;
      }
    }
    if (data.length >= Constants.EF_ZIP64_DSN) {
      offset = readUInt64LE(data, Constants.EF_ZIP64_RHO);
      if (_centralHeader.offset === Constants.EF_ZIP64_OR_32) {
        _centralHeader.offset = offset;
      }
    }
    if (data.length >= Constants.EF_ZIP64_DSN + 4) {
      diskNumStart = data.readUInt32LE(Constants.EF_ZIP64_DSN);
      if (_centralHeader.diskNumStart === Constants.EF_ZIP64_OR_16) {
        _centralHeader.diskNumStart = diskNumStart;
      }
    }
  }
  return {
    get entryName() {
      return decoder2.decode(_entryName);
    },
    get rawEntryName() {
      return _entryName;
    },
    set entryName(val) {
      _entryName = Utils$2.toBuffer(val, decoder2.encode);
      var lastChar = _entryName[_entryName.length - 1];
      _isDirectory = lastChar === 47 || lastChar === 92;
      _centralHeader.fileNameLength = _entryName.length;
    },
    get efs() {
      if (typeof _efs === "function") {
        return _efs(this.entryName);
      } else {
        return _efs;
      }
    },
    get extra() {
      return _extra;
    },
    set extra(val) {
      _extra = val;
      _centralHeader.extraLength = val.length;
      parseExtra(val);
    },
    get comment() {
      return decoder2.decode(_comment);
    },
    set comment(val) {
      _comment = Utils$2.toBuffer(val, decoder2.encode);
      _centralHeader.commentLength = _comment.length;
      if (_comment.length > 65535) throw Utils$2.Errors.COMMENT_TOO_LONG();
    },
    get name() {
      var n = decoder2.decode(_entryName);
      return _isDirectory ? n.substr(n.length - 1).split("/").pop() : n.split("/").pop();
    },
    get isDirectory() {
      return _isDirectory;
    },
    getCompressedData: function() {
      return compress(false, null);
    },
    getCompressedDataAsync: function(callback) {
      compress(true, callback);
    },
    setData: function(value) {
      uncompressedData = Utils$2.toBuffer(value, Utils$2.decoder.encode);
      if (!_isDirectory && uncompressedData.length) {
        _centralHeader.size = uncompressedData.length;
        _centralHeader.method = Utils$2.Constants.DEFLATED;
        _centralHeader.crc = Utils$2.crc32(value);
        _centralHeader.changed = true;
      } else {
        _centralHeader.method = Utils$2.Constants.STORED;
      }
    },
    getData: function(pass) {
      if (_centralHeader.changed) {
        return uncompressedData;
      } else {
        return decompress(false, null, pass);
      }
    },
    getDataAsync: function(callback, pass) {
      if (_centralHeader.changed) {
        callback(uncompressedData);
      } else {
        decompress(true, callback, pass);
      }
    },
    set attr(attr) {
      _centralHeader.attr = attr;
    },
    get attr() {
      return _centralHeader.attr;
    },
    set header(data) {
      _centralHeader.loadFromBinary(data);
    },
    get header() {
      return _centralHeader;
    },
    packCentralHeader: function() {
      _centralHeader.flags_efs = this.efs;
      _centralHeader.extraLength = _extra.length;
      var header = _centralHeader.centralHeaderToBinary();
      var addpos = Utils$2.Constants.CENHDR;
      _entryName.copy(header, addpos);
      addpos += _entryName.length;
      _extra.copy(header, addpos);
      addpos += _centralHeader.extraLength;
      _comment.copy(header, addpos);
      return header;
    },
    packLocalHeader: function() {
      let addpos = 0;
      _centralHeader.flags_efs = this.efs;
      _centralHeader.extraLocalLength = _extralocal.length;
      const localHeaderBuf = _centralHeader.localHeaderToBinary();
      const localHeader = Buffer.alloc(localHeaderBuf.length + _entryName.length + _centralHeader.extraLocalLength);
      localHeaderBuf.copy(localHeader, addpos);
      addpos += localHeaderBuf.length;
      _entryName.copy(localHeader, addpos);
      addpos += _entryName.length;
      _extralocal.copy(localHeader, addpos);
      addpos += _extralocal.length;
      return localHeader;
    },
    toJSON: function() {
      const bytes = function(nr) {
        return "<" + (nr && nr.length + " bytes buffer" || "null") + ">";
      };
      return {
        entryName: this.entryName,
        name: this.name,
        comment: this.comment,
        isDirectory: this.isDirectory,
        header: _centralHeader.toJSON(),
        compressedData: bytes(input),
        data: bytes(uncompressedData)
      };
    },
    toString: function() {
      return JSON.stringify(this.toJSON(), null, "	");
    }
  };
};
const ZipEntry$1 = zipEntry;
const Headers = headers;
const Utils$1 = utilExports;
var zipFile = function(inBuffer, options) {
  var entryList = [], entryTable = {}, _comment = Buffer.alloc(0), mainHeader2 = new Headers.MainHeader(), loadedEntries = false;
  const temporary = /* @__PURE__ */ new Set();
  const opts = options;
  const { noSort, decoder: decoder2 } = opts;
  if (inBuffer) {
    readMainHeader(opts.readEntries);
  } else {
    loadedEntries = true;
  }
  function makeTemporaryFolders() {
    const foldersList = /* @__PURE__ */ new Set();
    for (const elem of Object.keys(entryTable)) {
      const elements = elem.split("/");
      elements.pop();
      if (!elements.length) continue;
      for (let i = 0; i < elements.length; i++) {
        const sub = elements.slice(0, i + 1).join("/") + "/";
        foldersList.add(sub);
      }
    }
    for (const elem of foldersList) {
      if (!(elem in entryTable)) {
        const tempfolder = new ZipEntry$1(opts);
        tempfolder.entryName = elem;
        tempfolder.attr = 16;
        tempfolder.temporary = true;
        entryList.push(tempfolder);
        entryTable[tempfolder.entryName] = tempfolder;
        temporary.add(tempfolder);
      }
    }
  }
  function readEntries() {
    loadedEntries = true;
    entryTable = {};
    if (mainHeader2.diskEntries > (inBuffer.length - mainHeader2.offset) / Utils$1.Constants.CENHDR) {
      throw Utils$1.Errors.DISK_ENTRY_TOO_LARGE();
    }
    entryList = new Array(mainHeader2.diskEntries);
    var index = mainHeader2.offset;
    for (var i = 0; i < entryList.length; i++) {
      var tmp = index, entry = new ZipEntry$1(opts, inBuffer);
      entry.header = inBuffer.slice(tmp, tmp += Utils$1.Constants.CENHDR);
      entry.entryName = inBuffer.slice(tmp, tmp += entry.header.fileNameLength);
      if (entry.header.extraLength) {
        entry.extra = inBuffer.slice(tmp, tmp += entry.header.extraLength);
      }
      if (entry.header.commentLength) entry.comment = inBuffer.slice(tmp, tmp + entry.header.commentLength);
      index += entry.header.centralHeaderSize;
      entryList[i] = entry;
      entryTable[entry.entryName] = entry;
    }
    temporary.clear();
    makeTemporaryFolders();
  }
  function readMainHeader(readNow) {
    var i = inBuffer.length - Utils$1.Constants.ENDHDR, max = Math.max(0, i - 65535), n = max, endStart = inBuffer.length, endOffset = -1, commentEnd = 0;
    const trailingSpace = typeof opts.trailingSpace === "boolean" ? opts.trailingSpace : false;
    if (trailingSpace) max = 0;
    for (i; i >= n; i--) {
      if (inBuffer[i] !== 80) continue;
      if (inBuffer.readUInt32LE(i) === Utils$1.Constants.ENDSIG) {
        endOffset = i;
        commentEnd = i;
        endStart = i + Utils$1.Constants.ENDHDR;
        n = i - Utils$1.Constants.END64HDR;
        continue;
      }
      if (inBuffer.readUInt32LE(i) === Utils$1.Constants.END64SIG) {
        n = max;
        continue;
      }
      if (inBuffer.readUInt32LE(i) === Utils$1.Constants.ZIP64SIG) {
        endOffset = i;
        endStart = i + Utils$1.readBigUInt64LE(inBuffer, i + Utils$1.Constants.ZIP64SIZE) + Utils$1.Constants.ZIP64LEAD;
        break;
      }
    }
    if (endOffset == -1) throw Utils$1.Errors.INVALID_FORMAT();
    mainHeader2.loadFromBinary(inBuffer.slice(endOffset, endStart));
    if (mainHeader2.commentLength) {
      _comment = inBuffer.slice(commentEnd + Utils$1.Constants.ENDHDR);
    }
    if (readNow) readEntries();
  }
  function sortEntries() {
    if (entryList.length > 1 && !noSort) {
      entryList.sort((a, b) => a.entryName.toLowerCase().localeCompare(b.entryName.toLowerCase()));
    }
  }
  return {
    /**
     * Returns an array of ZipEntry objects existent in the current opened archive
     * @return Array
     */
    get entries() {
      if (!loadedEntries) {
        readEntries();
      }
      return entryList.filter((e) => !temporary.has(e));
    },
    /**
     * Archive comment
     * @return {String}
     */
    get comment() {
      return decoder2.decode(_comment);
    },
    set comment(val) {
      _comment = Utils$1.toBuffer(val, decoder2.encode);
      mainHeader2.commentLength = _comment.length;
    },
    getEntryCount: function() {
      if (!loadedEntries) {
        return mainHeader2.diskEntries;
      }
      return entryList.length;
    },
    forEach: function(callback) {
      this.entries.forEach(callback);
    },
    /**
     * Returns a reference to the entry with the given name or null if entry is inexistent
     *
     * @param entryName
     * @return ZipEntry
     */
    getEntry: function(entryName) {
      if (!loadedEntries) {
        readEntries();
      }
      return entryTable[entryName] || null;
    },
    /**
     * Adds the given entry to the entry list
     *
     * @param entry
     */
    setEntry: function(entry) {
      if (!loadedEntries) {
        readEntries();
      }
      entryList.push(entry);
      entryTable[entry.entryName] = entry;
      mainHeader2.totalEntries = entryList.length;
    },
    /**
     * Removes the file with the given name from the entry list.
     *
     * If the entry is a directory, then all nested files and directories will be removed
     * @param entryName
     * @returns {void}
     */
    deleteFile: function(entryName, withsubfolders = true) {
      if (!loadedEntries) {
        readEntries();
      }
      const entry = entryTable[entryName];
      const list = this.getEntryChildren(entry, withsubfolders).map((child) => child.entryName);
      list.forEach(this.deleteEntry);
    },
    /**
     * Removes the entry with the given name from the entry list.
     *
     * @param {string} entryName
     * @returns {void}
     */
    deleteEntry: function(entryName) {
      if (!loadedEntries) {
        readEntries();
      }
      const entry = entryTable[entryName];
      const index = entryList.indexOf(entry);
      if (index >= 0) {
        entryList.splice(index, 1);
        delete entryTable[entryName];
        mainHeader2.totalEntries = entryList.length;
      }
    },
    /**
     *  Iterates and returns all nested files and directories of the given entry
     *
     * @param entry
     * @return Array
     */
    getEntryChildren: function(entry, subfolders = true) {
      if (!loadedEntries) {
        readEntries();
      }
      if (typeof entry === "object") {
        if (entry.isDirectory && subfolders) {
          const list = [];
          const name = entry.entryName;
          for (const zipEntry2 of entryList) {
            if (zipEntry2.entryName.startsWith(name)) {
              list.push(zipEntry2);
            }
          }
          return list;
        } else {
          return [entry];
        }
      }
      return [];
    },
    /**
     *  How many child elements entry has
     *
     * @param {ZipEntry} entry
     * @return {integer}
     */
    getChildCount: function(entry) {
      if (entry && entry.isDirectory) {
        const list = this.getEntryChildren(entry);
        return list.includes(entry) ? list.length - 1 : list.length;
      }
      return 0;
    },
    /**
     * Returns the zip file
     *
     * @return Buffer
     */
    compressToBuffer: function() {
      if (!loadedEntries) {
        readEntries();
      }
      sortEntries();
      const dataBlock = [];
      const headerBlocks = [];
      let totalSize = 0;
      let dindex = 0;
      mainHeader2.size = 0;
      mainHeader2.offset = 0;
      let totalEntries = 0;
      for (const entry of this.entries) {
        const compressedData = entry.getCompressedData();
        entry.header.offset = dindex;
        const localHeader = entry.packLocalHeader();
        const dataLength = localHeader.length + compressedData.length;
        dindex += dataLength;
        dataBlock.push(localHeader);
        dataBlock.push(compressedData);
        const centralHeader = entry.packCentralHeader();
        headerBlocks.push(centralHeader);
        mainHeader2.size += centralHeader.length;
        totalSize += dataLength + centralHeader.length;
        totalEntries++;
      }
      totalSize += mainHeader2.mainHeaderSize;
      mainHeader2.offset = dindex;
      mainHeader2.totalEntries = totalEntries;
      dindex = 0;
      const outBuffer = Buffer.alloc(totalSize);
      for (const content of dataBlock) {
        content.copy(outBuffer, dindex);
        dindex += content.length;
      }
      for (const content of headerBlocks) {
        content.copy(outBuffer, dindex);
        dindex += content.length;
      }
      const mh = mainHeader2.toBinary();
      if (_comment) {
        _comment.copy(mh, Utils$1.Constants.ENDHDR);
      }
      mh.copy(outBuffer, dindex);
      inBuffer = outBuffer;
      loadedEntries = false;
      return outBuffer;
    },
    toAsyncBuffer: function(onSuccess, onFail, onItemStart, onItemEnd) {
      try {
        if (!loadedEntries) {
          readEntries();
        }
        sortEntries();
        const dataBlock = [];
        const centralHeaders = [];
        let totalSize = 0;
        let dindex = 0;
        let totalEntries = 0;
        mainHeader2.size = 0;
        mainHeader2.offset = 0;
        const compress2Buffer = function(entryLists) {
          if (entryLists.length > 0) {
            const entry = entryLists.shift();
            const name = entry.entryName + entry.extra.toString();
            if (onItemStart) onItemStart(name);
            entry.getCompressedDataAsync(function(compressedData) {
              if (onItemEnd) onItemEnd(name);
              entry.header.offset = dindex;
              const localHeader = entry.packLocalHeader();
              const dataLength = localHeader.length + compressedData.length;
              dindex += dataLength;
              dataBlock.push(localHeader);
              dataBlock.push(compressedData);
              const centalHeader = entry.packCentralHeader();
              centralHeaders.push(centalHeader);
              mainHeader2.size += centalHeader.length;
              totalSize += dataLength + centalHeader.length;
              totalEntries++;
              compress2Buffer(entryLists);
            });
          } else {
            totalSize += mainHeader2.mainHeaderSize;
            mainHeader2.offset = dindex;
            mainHeader2.totalEntries = totalEntries;
            dindex = 0;
            const outBuffer = Buffer.alloc(totalSize);
            dataBlock.forEach(function(content) {
              content.copy(outBuffer, dindex);
              dindex += content.length;
            });
            centralHeaders.forEach(function(content) {
              content.copy(outBuffer, dindex);
              dindex += content.length;
            });
            const mh = mainHeader2.toBinary();
            if (_comment) {
              _comment.copy(mh, Utils$1.Constants.ENDHDR);
            }
            mh.copy(outBuffer, dindex);
            inBuffer = outBuffer;
            loadedEntries = false;
            onSuccess(outBuffer);
          }
        };
        compress2Buffer(Array.from(this.entries));
      } catch (e) {
        onFail(e);
      }
    }
  };
};
const Utils = utilExports;
const pth = path$7;
const ZipEntry = zipEntry;
const ZipFile = zipFile;
const get_Bool = (...val) => Utils.findLast(val, (c) => typeof c === "boolean");
const get_Str = (...val) => Utils.findLast(val, (c) => typeof c === "string");
const get_Fun = (...val) => Utils.findLast(val, (c) => typeof c === "function");
const defaultOptions = {
  // option "noSort" : if true it disables files sorting
  noSort: false,
  // read entries during load (initial loading may be slower)
  readEntries: false,
  // default method is none
  method: Utils.Constants.NONE,
  // file system
  fs: null
};
var admZip = function(input, options) {
  let inBuffer = null;
  const opts = Object.assign(/* @__PURE__ */ Object.create(null), defaultOptions);
  if (input && "object" === typeof input) {
    if (!(input instanceof Uint8Array)) {
      Object.assign(opts, input);
      input = opts.input ? opts.input : void 0;
      if (opts.input) delete opts.input;
    }
    if (Buffer.isBuffer(input)) {
      inBuffer = input;
      opts.method = Utils.Constants.BUFFER;
      input = void 0;
    }
  }
  Object.assign(opts, options);
  const filetools = new Utils(opts);
  if (typeof opts.decoder !== "object" || typeof opts.decoder.encode !== "function" || typeof opts.decoder.decode !== "function") {
    opts.decoder = Utils.decoder;
  }
  if (input && "string" === typeof input) {
    if (filetools.fs.existsSync(input)) {
      opts.method = Utils.Constants.FILE;
      opts.filename = input;
      inBuffer = filetools.fs.readFileSync(input);
    } else {
      throw Utils.Errors.INVALID_FILENAME();
    }
  }
  const _zip = new ZipFile(inBuffer, opts);
  const { canonical, sanitize, zipnamefix } = Utils;
  function getEntry(entry) {
    if (entry && _zip) {
      var item;
      if (typeof entry === "string") item = _zip.getEntry(pth.posix.normalize(entry));
      if (typeof entry === "object" && typeof entry.entryName !== "undefined" && typeof entry.header !== "undefined") item = _zip.getEntry(entry.entryName);
      if (item) {
        return item;
      }
    }
    return null;
  }
  function fixPath(zipPath) {
    const { join, normalize, sep } = pth.posix;
    return join(pth.isAbsolute(zipPath) ? "/" : ".", normalize(sep + zipPath.split("\\").join(sep) + sep));
  }
  function filenameFilter(filterfn) {
    if (filterfn instanceof RegExp) {
      return /* @__PURE__ */ function(rx) {
        return function(filename) {
          return rx.test(filename);
        };
      }(filterfn);
    } else if ("function" !== typeof filterfn) {
      return () => true;
    }
    return filterfn;
  }
  const relativePath = (local, entry) => {
    let lastChar = entry.slice(-1);
    lastChar = lastChar === filetools.sep ? filetools.sep : "";
    return pth.relative(local, entry) + lastChar;
  };
  return {
    /**
     * Extracts the given entry from the archive and returns the content as a Buffer object
     * @param {ZipEntry|string} entry ZipEntry object or String with the full path of the entry
     * @param {Buffer|string} [pass] - password
     * @return Buffer or Null in case of error
     */
    readFile: function(entry, pass) {
      var item = getEntry(entry);
      return item && item.getData(pass) || null;
    },
    /**
     * Returns how many child elements has on entry (directories) on files it is always 0
     * @param {ZipEntry|string} entry ZipEntry object or String with the full path of the entry
     * @returns {integer}
     */
    childCount: function(entry) {
      const item = getEntry(entry);
      if (item) {
        return _zip.getChildCount(item);
      }
    },
    /**
     * Asynchronous readFile
     * @param {ZipEntry|string} entry ZipEntry object or String with the full path of the entry
     * @param {callback} callback
     *
     * @return Buffer or Null in case of error
     */
    readFileAsync: function(entry, callback) {
      var item = getEntry(entry);
      if (item) {
        item.getDataAsync(callback);
      } else {
        callback(null, "getEntry failed for:" + entry);
      }
    },
    /**
     * Extracts the given entry from the archive and returns the content as plain text in the given encoding
     * @param {ZipEntry|string} entry - ZipEntry object or String with the full path of the entry
     * @param {string} encoding - Optional. If no encoding is specified utf8 is used
     *
     * @return String
     */
    readAsText: function(entry, encoding) {
      var item = getEntry(entry);
      if (item) {
        var data = item.getData();
        if (data && data.length) {
          return data.toString(encoding || "utf8");
        }
      }
      return "";
    },
    /**
     * Asynchronous readAsText
     * @param {ZipEntry|string} entry ZipEntry object or String with the full path of the entry
     * @param {callback} callback
     * @param {string} [encoding] - Optional. If no encoding is specified utf8 is used
     *
     * @return String
     */
    readAsTextAsync: function(entry, callback, encoding) {
      var item = getEntry(entry);
      if (item) {
        item.getDataAsync(function(data, err) {
          if (err) {
            callback(data, err);
            return;
          }
          if (data && data.length) {
            callback(data.toString(encoding || "utf8"));
          } else {
            callback("");
          }
        });
      } else {
        callback("");
      }
    },
    /**
     * Remove the entry from the file or the entry and all it's nested directories and files if the given entry is a directory
     *
     * @param {ZipEntry|string} entry
     * @returns {void}
     */
    deleteFile: function(entry, withsubfolders = true) {
      var item = getEntry(entry);
      if (item) {
        _zip.deleteFile(item.entryName, withsubfolders);
      }
    },
    /**
     * Remove the entry from the file or directory without affecting any nested entries
     *
     * @param {ZipEntry|string} entry
     * @returns {void}
     */
    deleteEntry: function(entry) {
      var item = getEntry(entry);
      if (item) {
        _zip.deleteEntry(item.entryName);
      }
    },
    /**
     * Adds a comment to the zip. The zip must be rewritten after adding the comment.
     *
     * @param {string} comment
     */
    addZipComment: function(comment) {
      _zip.comment = comment;
    },
    /**
     * Returns the zip comment
     *
     * @return String
     */
    getZipComment: function() {
      return _zip.comment || "";
    },
    /**
     * Adds a comment to a specified zipEntry. The zip must be rewritten after adding the comment
     * The comment cannot exceed 65535 characters in length
     *
     * @param {ZipEntry} entry
     * @param {string} comment
     */
    addZipEntryComment: function(entry, comment) {
      var item = getEntry(entry);
      if (item) {
        item.comment = comment;
      }
    },
    /**
     * Returns the comment of the specified entry
     *
     * @param {ZipEntry} entry
     * @return String
     */
    getZipEntryComment: function(entry) {
      var item = getEntry(entry);
      if (item) {
        return item.comment || "";
      }
      return "";
    },
    /**
     * Updates the content of an existing entry inside the archive. The zip must be rewritten after updating the content
     *
     * @param {ZipEntry} entry
     * @param {Buffer} content
     */
    updateFile: function(entry, content) {
      var item = getEntry(entry);
      if (item) {
        item.setData(content);
      }
    },
    /**
     * Adds a file from the disk to the archive
     *
     * @param {string} localPath File to add to zip
     * @param {string} [zipPath] Optional path inside the zip
     * @param {string} [zipName] Optional name for the file
     * @param {string} [comment] Optional file comment
     */
    addLocalFile: function(localPath2, zipPath, zipName, comment) {
      if (filetools.fs.existsSync(localPath2)) {
        zipPath = zipPath ? fixPath(zipPath) : "";
        const p = pth.win32.basename(pth.win32.normalize(localPath2));
        zipPath += zipName ? zipName : p;
        const _attr = filetools.fs.statSync(localPath2);
        const data = _attr.isFile() ? filetools.fs.readFileSync(localPath2) : Buffer.alloc(0);
        if (_attr.isDirectory()) zipPath += filetools.sep;
        this.addFile(zipPath, data, comment, _attr);
      } else {
        throw Utils.Errors.FILE_NOT_FOUND(localPath2);
      }
    },
    /**
     * Callback for showing if everything was done.
     *
     * @callback doneCallback
     * @param {Error} err - Error object
     * @param {boolean} done - was request fully completed
     */
    /**
     * Adds a file from the disk to the archive
     *
     * @param {(object|string)} options - options object, if it is string it us used as localPath.
     * @param {string} options.localPath - Local path to the file.
     * @param {string} [options.comment] - Optional file comment.
     * @param {string} [options.zipPath] - Optional path inside the zip
     * @param {string} [options.zipName] - Optional name for the file
     * @param {doneCallback} callback - The callback that handles the response.
     */
    addLocalFileAsync: function(options2, callback) {
      options2 = typeof options2 === "object" ? options2 : { localPath: options2 };
      const localPath2 = pth.resolve(options2.localPath);
      const { comment } = options2;
      let { zipPath, zipName } = options2;
      const self2 = this;
      filetools.fs.stat(localPath2, function(err, stats) {
        if (err) return callback(err, false);
        zipPath = zipPath ? fixPath(zipPath) : "";
        const p = pth.win32.basename(pth.win32.normalize(localPath2));
        zipPath += zipName ? zipName : p;
        if (stats.isFile()) {
          filetools.fs.readFile(localPath2, function(err2, data) {
            if (err2) return callback(err2, false);
            self2.addFile(zipPath, data, comment, stats);
            return setImmediate(callback, void 0, true);
          });
        } else if (stats.isDirectory()) {
          zipPath += filetools.sep;
          self2.addFile(zipPath, Buffer.alloc(0), comment, stats);
          return setImmediate(callback, void 0, true);
        }
      });
    },
    /**
     * Adds a local directory and all its nested files and directories to the archive
     *
     * @param {string} localPath - local path to the folder
     * @param {string} [zipPath] - optional path inside zip
     * @param {(RegExp|function)} [filter] - optional RegExp or Function if files match will be included.
     */
    addLocalFolder: function(localPath2, zipPath, filter) {
      filter = filenameFilter(filter);
      zipPath = zipPath ? fixPath(zipPath) : "";
      localPath2 = pth.normalize(localPath2);
      if (filetools.fs.existsSync(localPath2)) {
        const items2 = filetools.findFiles(localPath2);
        const self2 = this;
        if (items2.length) {
          for (const filepath of items2) {
            const p = pth.join(zipPath, relativePath(localPath2, filepath));
            if (filter(p)) {
              self2.addLocalFile(filepath, pth.dirname(p));
            }
          }
        }
      } else {
        throw Utils.Errors.FILE_NOT_FOUND(localPath2);
      }
    },
    /**
     * Asynchronous addLocalFolder
     * @param {string} localPath
     * @param {callback} callback
     * @param {string} [zipPath] optional path inside zip
     * @param {RegExp|function} [filter] optional RegExp or Function if files match will
     *               be included.
     */
    addLocalFolderAsync: function(localPath2, callback, zipPath, filter) {
      filter = filenameFilter(filter);
      zipPath = zipPath ? fixPath(zipPath) : "";
      localPath2 = pth.normalize(localPath2);
      var self2 = this;
      filetools.fs.open(localPath2, "r", function(err) {
        if (err && err.code === "ENOENT") {
          callback(void 0, Utils.Errors.FILE_NOT_FOUND(localPath2));
        } else if (err) {
          callback(void 0, err);
        } else {
          var items2 = filetools.findFiles(localPath2);
          var i = -1;
          var next = function() {
            i += 1;
            if (i < items2.length) {
              var filepath = items2[i];
              var p = relativePath(localPath2, filepath).split("\\").join("/");
              p = p.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "");
              if (filter(p)) {
                filetools.fs.stat(filepath, function(er0, stats) {
                  if (er0) callback(void 0, er0);
                  if (stats.isFile()) {
                    filetools.fs.readFile(filepath, function(er1, data) {
                      if (er1) {
                        callback(void 0, er1);
                      } else {
                        self2.addFile(zipPath + p, data, "", stats);
                        next();
                      }
                    });
                  } else {
                    self2.addFile(zipPath + p + "/", Buffer.alloc(0), "", stats);
                    next();
                  }
                });
              } else {
                process.nextTick(() => {
                  next();
                });
              }
            } else {
              callback(true, void 0);
            }
          };
          next();
        }
      });
    },
    /**
     * Adds a local directory and all its nested files and directories to the archive
     *
     * @param {object | string} options - options object, if it is string it us used as localPath.
     * @param {string} options.localPath - Local path to the folder.
     * @param {string} [options.zipPath] - optional path inside zip.
     * @param {RegExp|function} [options.filter] - optional RegExp or Function if files match will be included.
     * @param {function|string} [options.namefix] - optional function to help fix filename
     * @param {doneCallback} callback - The callback that handles the response.
     *
     */
    addLocalFolderAsync2: function(options2, callback) {
      const self2 = this;
      options2 = typeof options2 === "object" ? options2 : { localPath: options2 };
      localPath = pth.resolve(fixPath(options2.localPath));
      let { zipPath, filter, namefix } = options2;
      if (filter instanceof RegExp) {
        filter = /* @__PURE__ */ function(rx) {
          return function(filename) {
            return rx.test(filename);
          };
        }(filter);
      } else if ("function" !== typeof filter) {
        filter = function() {
          return true;
        };
      }
      zipPath = zipPath ? fixPath(zipPath) : "";
      if (namefix == "latin1") {
        namefix = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "");
      }
      if (typeof namefix !== "function") namefix = (str) => str;
      const relPathFix = (entry) => pth.join(zipPath, namefix(relativePath(localPath, entry)));
      const fileNameFix = (entry) => pth.win32.basename(pth.win32.normalize(namefix(entry)));
      filetools.fs.open(localPath, "r", function(err) {
        if (err && err.code === "ENOENT") {
          callback(void 0, Utils.Errors.FILE_NOT_FOUND(localPath));
        } else if (err) {
          callback(void 0, err);
        } else {
          filetools.findFilesAsync(localPath, function(err2, fileEntries) {
            if (err2) return callback(err2);
            fileEntries = fileEntries.filter((dir) => filter(relPathFix(dir)));
            if (!fileEntries.length) callback(void 0, false);
            setImmediate(
              fileEntries.reverse().reduce(function(next, entry) {
                return function(err3, done) {
                  if (err3 || done === false) return setImmediate(next, err3, false);
                  self2.addLocalFileAsync(
                    {
                      localPath: entry,
                      zipPath: pth.dirname(relPathFix(entry)),
                      zipName: fileNameFix(entry)
                    },
                    next
                  );
                };
              }, callback)
            );
          });
        }
      });
    },
    /**
     * Adds a local directory and all its nested files and directories to the archive
     *
     * @param {string} localPath - path where files will be extracted
     * @param {object} props - optional properties
     * @param {string} [props.zipPath] - optional path inside zip
     * @param {RegExp|function} [props.filter] - optional RegExp or Function if files match will be included.
     * @param {function|string} [props.namefix] - optional function to help fix filename
     */
    addLocalFolderPromise: function(localPath2, props) {
      return new Promise((resolve2, reject) => {
        this.addLocalFolderAsync2(Object.assign({ localPath: localPath2 }, props), (err, done) => {
          if (err) reject(err);
          if (done) resolve2(this);
        });
      });
    },
    /**
     * Allows you to create a entry (file or directory) in the zip file.
     * If you want to create a directory the entryName must end in / and a null buffer should be provided.
     * Comment and attributes are optional
     *
     * @param {string} entryName
     * @param {Buffer | string} content - file content as buffer or utf8 coded string
     * @param {string} [comment] - file comment
     * @param {number | object} [attr] - number as unix file permissions, object as filesystem Stats object
     */
    addFile: function(entryName, content, comment, attr) {
      entryName = zipnamefix(entryName);
      let entry = getEntry(entryName);
      const update = entry != null;
      if (!update) {
        entry = new ZipEntry(opts);
        entry.entryName = entryName;
      }
      entry.comment = comment || "";
      const isStat = "object" === typeof attr && attr instanceof filetools.fs.Stats;
      if (isStat) {
        entry.header.time = attr.mtime;
      }
      var fileattr = entry.isDirectory ? 16 : 0;
      let unix = entry.isDirectory ? 16384 : 32768;
      if (isStat) {
        unix |= 4095 & attr.mode;
      } else if ("number" === typeof attr) {
        unix |= 4095 & attr;
      } else {
        unix |= entry.isDirectory ? 493 : 420;
      }
      fileattr = (fileattr | unix << 16) >>> 0;
      entry.attr = fileattr;
      entry.setData(content);
      if (!update) _zip.setEntry(entry);
      return entry;
    },
    /**
     * Returns an array of ZipEntry objects representing the files and folders inside the archive
     *
     * @param {string} [password]
     * @returns Array
     */
    getEntries: function(password) {
      _zip.password = password;
      return _zip ? _zip.entries : [];
    },
    /**
     * Returns a ZipEntry object representing the file or folder specified by ``name``.
     *
     * @param {string} name
     * @return ZipEntry
     */
    getEntry: function(name) {
      return getEntry(name);
    },
    getEntryCount: function() {
      return _zip.getEntryCount();
    },
    forEach: function(callback) {
      return _zip.forEach(callback);
    },
    /**
     * Extracts the given entry to the given targetPath
     * If the entry is a directory inside the archive, the entire directory and it's subdirectories will be extracted
     *
     * @param {string|ZipEntry} entry - ZipEntry object or String with the full path of the entry
     * @param {string} targetPath - Target folder where to write the file
     * @param {boolean} [maintainEntryPath=true] - If maintainEntryPath is true and the entry is inside a folder, the entry folder will be created in targetPath as well. Default is TRUE
     * @param {boolean} [overwrite=false] - If the file already exists at the target path, the file will be overwriten if this is true.
     * @param {boolean} [keepOriginalPermission=false] - The file will be set as the permission from the entry if this is true.
     * @param {string} [outFileName] - String If set will override the filename of the extracted file (Only works if the entry is a file)
     *
     * @return Boolean
     */
    extractEntryTo: function(entry, targetPath, maintainEntryPath, overwrite, keepOriginalPermission, outFileName) {
      overwrite = get_Bool(false, overwrite);
      keepOriginalPermission = get_Bool(false, keepOriginalPermission);
      maintainEntryPath = get_Bool(true, maintainEntryPath);
      outFileName = get_Str(keepOriginalPermission, outFileName);
      var item = getEntry(entry);
      if (!item) {
        throw Utils.Errors.NO_ENTRY();
      }
      var entryName = canonical(item.entryName);
      var target = sanitize(targetPath, outFileName && !item.isDirectory ? outFileName : maintainEntryPath ? entryName : pth.basename(entryName));
      if (item.isDirectory) {
        var children = _zip.getEntryChildren(item);
        children.forEach(function(child) {
          if (child.isDirectory) return;
          var content2 = child.getData();
          if (!content2) {
            throw Utils.Errors.CANT_EXTRACT_FILE();
          }
          var name = canonical(child.entryName);
          var childName = sanitize(targetPath, maintainEntryPath ? name : pth.basename(name));
          const fileAttr2 = keepOriginalPermission ? child.header.fileAttr : void 0;
          filetools.writeFileTo(childName, content2, overwrite, fileAttr2);
        });
        return true;
      }
      var content = item.getData(_zip.password);
      if (!content) throw Utils.Errors.CANT_EXTRACT_FILE();
      if (filetools.fs.existsSync(target) && !overwrite) {
        throw Utils.Errors.CANT_OVERRIDE();
      }
      const fileAttr = keepOriginalPermission ? entry.header.fileAttr : void 0;
      filetools.writeFileTo(target, content, overwrite, fileAttr);
      return true;
    },
    /**
     * Test the archive
     * @param {string} [pass]
     */
    test: function(pass) {
      if (!_zip) {
        return false;
      }
      for (var entry in _zip.entries) {
        try {
          if (entry.isDirectory) {
            continue;
          }
          var content = _zip.entries[entry].getData(pass);
          if (!content) {
            return false;
          }
        } catch (err) {
          return false;
        }
      }
      return true;
    },
    /**
     * Extracts the entire archive to the given location
     *
     * @param {string} targetPath Target location
     * @param {boolean} [overwrite=false] If the file already exists at the target path, the file will be overwriten if this is true.
     *                  Default is FALSE
     * @param {boolean} [keepOriginalPermission=false] The file will be set as the permission from the entry if this is true.
     *                  Default is FALSE
     * @param {string|Buffer} [pass] password
     */
    extractAllTo: function(targetPath, overwrite, keepOriginalPermission, pass) {
      keepOriginalPermission = get_Bool(false, keepOriginalPermission);
      pass = get_Str(keepOriginalPermission, pass);
      overwrite = get_Bool(false, overwrite);
      if (!_zip) throw Utils.Errors.NO_ZIP();
      _zip.entries.forEach(function(entry) {
        var entryName = sanitize(targetPath, canonical(entry.entryName));
        if (entry.isDirectory) {
          filetools.makeDir(entryName);
          return;
        }
        var content = entry.getData(pass);
        if (!content) {
          throw Utils.Errors.CANT_EXTRACT_FILE();
        }
        const fileAttr = keepOriginalPermission ? entry.header.fileAttr : void 0;
        filetools.writeFileTo(entryName, content, overwrite, fileAttr);
        try {
          filetools.fs.utimesSync(entryName, entry.header.time, entry.header.time);
        } catch (err) {
          throw Utils.Errors.CANT_EXTRACT_FILE();
        }
      });
    },
    /**
     * Asynchronous extractAllTo
     *
     * @param {string} targetPath Target location
     * @param {boolean} [overwrite=false] If the file already exists at the target path, the file will be overwriten if this is true.
     *                  Default is FALSE
     * @param {boolean} [keepOriginalPermission=false] The file will be set as the permission from the entry if this is true.
     *                  Default is FALSE
     * @param {function} callback The callback will be executed when all entries are extracted successfully or any error is thrown.
     */
    extractAllToAsync: function(targetPath, overwrite, keepOriginalPermission, callback) {
      callback = get_Fun(overwrite, keepOriginalPermission, callback);
      keepOriginalPermission = get_Bool(false, keepOriginalPermission);
      overwrite = get_Bool(false, overwrite);
      if (!callback) {
        return new Promise((resolve2, reject) => {
          this.extractAllToAsync(targetPath, overwrite, keepOriginalPermission, function(err) {
            if (err) {
              reject(err);
            } else {
              resolve2(this);
            }
          });
        });
      }
      if (!_zip) {
        callback(Utils.Errors.NO_ZIP());
        return;
      }
      targetPath = pth.resolve(targetPath);
      const getPath = (entry) => sanitize(targetPath, pth.normalize(canonical(entry.entryName)));
      const getError = (msg, file) => new Error(msg + ': "' + file + '"');
      const dirEntries = [];
      const fileEntries = [];
      _zip.entries.forEach((e) => {
        if (e.isDirectory) {
          dirEntries.push(e);
        } else {
          fileEntries.push(e);
        }
      });
      for (const entry of dirEntries) {
        const dirPath = getPath(entry);
        const dirAttr = keepOriginalPermission ? entry.header.fileAttr : void 0;
        try {
          filetools.makeDir(dirPath);
          if (dirAttr) filetools.fs.chmodSync(dirPath, dirAttr);
          filetools.fs.utimesSync(dirPath, entry.header.time, entry.header.time);
        } catch (er) {
          callback(getError("Unable to create folder", dirPath));
        }
      }
      fileEntries.reverse().reduce(function(next, entry) {
        return function(err) {
          if (err) {
            next(err);
          } else {
            const entryName = pth.normalize(canonical(entry.entryName));
            const filePath = sanitize(targetPath, entryName);
            entry.getDataAsync(function(content, err_1) {
              if (err_1) {
                next(err_1);
              } else if (!content) {
                next(Utils.Errors.CANT_EXTRACT_FILE());
              } else {
                const fileAttr = keepOriginalPermission ? entry.header.fileAttr : void 0;
                filetools.writeFileToAsync(filePath, content, overwrite, fileAttr, function(succ) {
                  if (!succ) {
                    next(getError("Unable to write file", filePath));
                  }
                  filetools.fs.utimes(filePath, entry.header.time, entry.header.time, function(err_2) {
                    if (err_2) {
                      next(getError("Unable to set times", filePath));
                    } else {
                      next();
                    }
                  });
                });
              }
            });
          }
        };
      }, callback)();
    },
    /**
     * Writes the newly created zip file to disk at the specified location or if a zip was opened and no ``targetFileName`` is provided, it will overwrite the opened zip
     *
     * @param {string} targetFileName
     * @param {function} callback
     */
    writeZip: function(targetFileName, callback) {
      if (arguments.length === 1) {
        if (typeof targetFileName === "function") {
          callback = targetFileName;
          targetFileName = "";
        }
      }
      if (!targetFileName && opts.filename) {
        targetFileName = opts.filename;
      }
      if (!targetFileName) return;
      var zipData = _zip.compressToBuffer();
      if (zipData) {
        var ok = filetools.writeFileTo(targetFileName, zipData, true);
        if (typeof callback === "function") callback(!ok ? new Error("failed") : null, "");
      }
    },
    /**
             *
             * @param {string} targetFileName
             * @param {object} [props]
             * @param {boolean} [props.overwrite=true] If the file already exists at the target path, the file will be overwriten if this is true.
             * @param {boolean} [props.perm] The file will be set as the permission from the entry if this is true.
    
             * @returns {Promise<void>}
             */
    writeZipPromise: function(targetFileName, props) {
      const { overwrite, perm } = Object.assign({ overwrite: true }, props);
      return new Promise((resolve2, reject) => {
        if (!targetFileName && opts.filename) targetFileName = opts.filename;
        if (!targetFileName) reject("ADM-ZIP: ZIP File Name Missing");
        this.toBufferPromise().then((zipData) => {
          const ret = (done) => done ? resolve2(done) : reject("ADM-ZIP: Wasn't able to write zip file");
          filetools.writeFileToAsync(targetFileName, zipData, overwrite, perm, ret);
        }, reject);
      });
    },
    /**
     * @returns {Promise<Buffer>} A promise to the Buffer.
     */
    toBufferPromise: function() {
      return new Promise((resolve2, reject) => {
        _zip.toAsyncBuffer(resolve2, reject);
      });
    },
    /**
     * Returns the content of the entire zip file as a Buffer object
     *
     * @prop {function} [onSuccess]
     * @prop {function} [onFail]
     * @prop {function} [onItemStart]
     * @prop {function} [onItemEnd]
     * @returns {Buffer}
     */
    toBuffer: function(onSuccess, onFail, onItemStart, onItemEnd) {
      if (typeof onSuccess === "function") {
        _zip.toAsyncBuffer(onSuccess, onFail, onItemStart, onItemEnd);
        return null;
      }
      return _zip.compressToBuffer();
    }
  };
};
const AdmZip = /* @__PURE__ */ getDefaultExportFromCjs(admZip);
const zipCache = /* @__PURE__ */ new Map();
function getZip(filePath) {
  const stat = fs$4.statSync(filePath);
  const cached = zipCache.get(filePath);
  if (cached && cached.mtime === stat.mtimeMs) {
    return cached.zip;
  }
  const zip = new AdmZip(filePath);
  zipCache.set(filePath, { zip, mtime: stat.mtimeMs });
  return zip;
}
function registerEpubHandlers() {
  require$$1$1.ipcMain.handle("epub:extractAll", wrapHandler((_event, filePath) => {
    try {
      const zip = getZip(filePath);
      const entries = zip.getEntries();
      const result = [];
      for (const entry of entries) {
        if (entry.isDirectory) continue;
        const data = Array.from(entry.getData());
        result.push({ name: entry.entryName, data });
      }
      return result;
    } catch (err) {
      console.error("EPUB extractAll failed:", err);
      return null;
    }
  }, "epub:extractAll"));
  require$$1$1.ipcMain.handle("epub:listEntries", wrapHandler((_event, filePath) => {
    const zip = getZip(filePath);
    const entries = zip.getEntries();
    return entries.filter((e) => !e.isDirectory).map((e) => ({
      name: e.entryName,
      size: e.header.size,
      compressedSize: e.header.compressedSize,
      time: e.header.time
    }));
  }, "epub:listEntries"));
  require$$1$1.ipcMain.handle("epub:getEntry", wrapHandler((_event, filePath, entryName) => {
    const zip = getZip(filePath);
    const entry = zip.getEntry(entryName);
    if (!entry) return null;
    const data = entry.getData();
    return {
      name: entry.entryName,
      data: Array.from(data),
      size: data.length
    };
  }, "epub:getEntry"));
  require$$1$1.ipcMain.handle("epub:getEntries", wrapHandler((_event, filePath, entryNames) => {
    const zip = getZip(filePath);
    return entryNames.map((name) => {
      const entry = zip.getEntry(name);
      if (!entry) return { name, data: null };
      const data = entry.getData();
      return {
        name: entry.entryName,
        data: Array.from(data),
        size: data.length
      };
    });
  }, "epub:getEntries"));
  require$$1$1.ipcMain.handle("epub:clearCache", wrapHandler((_event, filePath) => {
    if (filePath) {
      zipCache.delete(filePath);
    } else {
      zipCache.clear();
    }
  }, "epub:clearCache"));
}
function findCoverFromOpf(entries, entryMap) {
  let opfPath = "";
  const containerEntry = entryMap.get("META-INF/container.xml");
  if (containerEntry) {
    const containerXml = containerEntry.getData().toString("utf-8");
    const rootfileMatch = containerXml.match(/full-path\s*=\s*["']([^"']+)["']/i);
    if (rootfileMatch) {
      opfPath = rootfileMatch[1];
    }
  }
  if (!opfPath) {
    const candidates = [
      "content.opf",
      "OEBPS/content.opf",
      "OPS/content.opf",
      "OEB/content.opf",
      "EPUB/content.opf",
      "Standard/content.opf"
    ];
    for (const c of candidates) {
      if (entryMap.has(c)) {
        opfPath = c;
        break;
      }
    }
  }
  if (!opfPath) return null;
  const opfEntry = entryMap.get(opfPath);
  if (!opfEntry) return null;
  const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";
  const opfXml = opfEntry.getData().toString("utf-8");
  const coverMetaMatch = opfXml.match(/<meta\s+[^>]*name\s*=\s*["']cover["'][^>]*content\s*=\s*["']([^"']+)["']/i) || opfXml.match(/<meta\s+[^>]*content\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']cover["']/i);
  if (coverMetaMatch) {
    const coverId = coverMetaMatch[1];
    const idItemMatch = opfXml.match(
      new RegExp(`<item\\s+[^>]*id\\s*=\\s*["']${escapeRegExp(coverId)}["'][^>]*href\\s*=\\s*["']([^"']+)["']`, "i")
    ) || opfXml.match(
      new RegExp(`<item\\s+[^>]*href\\s*=\\s*["']([^"']+)["'][^>]*id\\s*=\\s*["']${escapeRegExp(coverId)}["']`, "i")
    );
    if (idItemMatch) {
      return resolveHref(opfDir, idItemMatch[1]);
    }
    if (isImagePath(coverId)) {
      return resolveHref(opfDir, coverId);
    }
  }
  const thumbMatch = opfXml.match(/<meta\s+[^>]*name\s*=\s*["']Cover\s+ThumbNail\s+Image["'][^>]*content\s*=\s*["']([^"']+)["']/i) || opfXml.match(/<meta\s+[^>]*content\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']Cover\s+ThumbNail\s+Image["']/i);
  if (thumbMatch && isImagePath(thumbMatch[1])) {
    return resolveHref(opfDir, thumbMatch[1]);
  }
  const epub3CoverMatch = opfXml.match(/<item\s+[^>]*properties\s*=\s*["'][^"']*cover-image[^"']*["'][^>]*href\s*=\s*["']([^"']+)["']/i) || opfXml.match(/<item\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*properties\s*=\s*["'][^"']*cover-image[^"']*["']/i);
  if (epub3CoverMatch) {
    return resolveHref(opfDir, epub3CoverMatch[1]);
  }
  const coverIdPatterns = ["cover-image", "cover", "CoverImage", "coverimage", "front-cover-image"];
  for (const idPat of coverIdPatterns) {
    const idMatch = opfXml.match(
      new RegExp(`<item\\s+[^>]*id\\s*=\\s*["']${idPat}["'][^>]*href\\s*=\\s*["']([^"']+)["']`, "i")
    ) || opfXml.match(
      new RegExp(`<item\\s+[^>]*href\\s*=\\s*["']([^"']+)["'][^>]*id\\s*=\\s*["']${idPat}["']`, "i")
    );
    if (idMatch) {
      const href = resolveHref(opfDir, idMatch[1]);
      if (isImagePath(href)) return href;
    }
  }
  const itemRegex = /<item\s+[^>]*(?:id|href)\s*=\s*["'][^"']*cover[^"']*["'][^>]*(?:href|id)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = itemRegex.exec(opfXml)) !== null) {
    if (isImagePath(m[1])) {
      return resolveHref(opfDir, m[1]);
    }
  }
  return null;
}
function resolveHref(opfDir, href) {
  href = decodeURIComponent(href);
  if (!opfDir) return href;
  const parts = (opfDir + href).split("/");
  const resolved = [];
  for (const part of parts) {
    if (part === "..") resolved.pop();
    else if (part !== "." && part !== "") resolved.push(part);
  }
  return resolved.join("/");
}
function isImagePath(p) {
  return /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(p);
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function registerCoverHandlers() {
  require$$1$1.ipcMain.handle("cover:save", wrapHandler((_event, bookId, base64DataUrl) => {
    ensureDir(COVERS_DIR);
    const matches = /^data:image\/([a-z]{1,20});base64,/i.exec(base64DataUrl);
    if (!matches) return null;
    const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
    const filePath = path$7.join(COVERS_DIR, bookId + "." + ext);
    fs$4.writeFileSync(filePath, base64DataUrl.substring(matches[0].length), { encoding: "base64" });
    return filePath;
  }, "cover:save"));
  require$$1$1.ipcMain.handle("cover:delete", wrapHandler((_event, filePath) => {
    try {
      if (!filePath) return;
      const resolved = path$7.resolve(filePath);
      if (!resolved.startsWith(COVERS_DIR)) return;
      if (fs$4.existsSync(resolved)) fs$4.unlinkSync(resolved);
    } catch (err) {
      console.error("cover:delete error:", err);
    }
  }, "cover:delete"));
  require$$1$1.ipcMain.handle("cover:exists", wrapHandler((_event, filePath) => {
    try {
      return fs$4.existsSync(filePath);
    } catch {
      return false;
    }
  }, "cover:exists"));
  require$$1$1.ipcMain.handle("cover:findEpubCover", wrapHandler((_event, bookId, filePath) => {
    try {
      ensureDir(COVERS_DIR);
      const zip = new AdmZip(filePath);
      const entries = zip.getEntries();
      const entryMap = new Map(entries.map((e) => [e.entryName, e]));
      const coverPath = findCoverFromOpf(entries, entryMap);
      if (coverPath) {
        const entry = entryMap.get(coverPath);
        if (entry) {
          const ext = path$7.extname(coverPath).toLowerCase();
          const saveExt = ext === ".jpeg" ? ".jpg" : ext || ".jpg";
          const destPath = path$7.join(COVERS_DIR, bookId + saveExt);
          fs$4.writeFileSync(destPath, entry.getData());
          return destPath;
        }
      }
      const imgExts = /* @__PURE__ */ new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
      const isImage = (n) => imgExts.has(path$7.extname(n).toLowerCase());
      const isCoverName = (n) => {
        const lower = n.toLowerCase();
        return lower.includes("cover") || lower.includes("front") || lower.includes("conver");
      };
      const best = entries.filter((e) => !e.isDirectory && isImage(e.entryName) && isCoverName(e.entryName)).sort((a, b) => b.header.size - a.header.size)[0];
      if (best) {
        const ext = path$7.extname(best.entryName).toLowerCase();
        const saveExt = ext === ".jpeg" ? ".jpg" : ext || ".jpg";
        const destPath = path$7.join(COVERS_DIR, bookId + saveExt);
        fs$4.writeFileSync(destPath, best.getData());
        return destPath;
      }
      return null;
    } catch {
      return null;
    }
  }, "cover:findEpubCover"));
}
function registerFontHandlers() {
  require$$1$1.ipcMain.handle("font:copyToCache", wrapHandler((_event, srcPath) => {
    ensureDir(FONTS_DIR);
    const ext = path$7.extname(srcPath) || ".ttf";
    const fileName = path$7.basename(srcPath, ext);
    const destPath = path$7.join(FONTS_DIR, fileName + ext);
    fs$4.copyFileSync(srcPath, destPath);
    return destPath;
  }, "font:copyToCache"));
  require$$1$1.ipcMain.handle("font:delete", wrapHandler((_event, filePath) => {
    try {
      if (!filePath) return;
      const resolved = path$7.resolve(filePath);
      if (!resolved.startsWith(FONTS_DIR)) return;
      if (fs$4.existsSync(resolved)) fs$4.unlinkSync(resolved);
    } catch (err) {
      console.error("font:delete error:", err);
    }
  }, "font:delete"));
  require$$1$1.ipcMain.handle("font:getFiles", wrapHandler(() => {
    try {
      ensureDir(FONTS_DIR);
      return fs$4.readdirSync(FONTS_DIR).filter((name) => /\.(ttf|otf|woff|woff2)$/i.test(name)).map((name) => ({
        name: path$7.basename(name, path$7.extname(name)),
        path: path$7.join(FONTS_DIR, name)
      }));
    } catch {
      return [];
    }
  }, "font:getFiles"));
  require$$1$1.ipcMain.handle("font:getBase64", wrapHandler((_event, filePath) => {
    try {
      if (!filePath) return null;
      const resolved = path$7.resolve(filePath);
      if (!fs$4.existsSync(resolved)) return null;
      const buffer = fs$4.readFileSync(resolved);
      const ext = path$7.extname(resolved).toLowerCase();
      let mimeType = "font/ttf";
      if (ext === ".otf") mimeType = "font/otf";
      else if (ext === ".woff") mimeType = "font/woff";
      else if (ext === ".woff2") mimeType = "font/woff2";
      return {
        data: buffer.toString("base64"),
        mimeType
      };
    } catch (err) {
      console.error("font:getBase64 error:", err);
      return null;
    }
  }, "font:getBase64"));
}
function registerAiHandlers() {
  require$$1$1.ipcMain.handle("ai:ensureCacheDir", wrapHandler(() => {
    ensureDir(AI_CACHE_DIR);
    return AI_CACHE_DIR;
  }, "ai:ensureCacheDir"));
  require$$1$1.ipcMain.handle("ai:readCacheFile", wrapHandler((_event, filePath) => {
    try {
      const resolved = path$7.resolve(filePath);
      if (!resolved.startsWith(AI_CACHE_DIR)) return null;
      if (!fs$4.existsSync(resolved)) return null;
      return fs$4.readFileSync(resolved, { encoding: "utf-8" });
    } catch {
      return null;
    }
  }, "ai:readCacheFile"));
  require$$1$1.ipcMain.handle("ai:writeCacheFile", wrapHandler((_event, filePath, data) => {
    try {
      ensureDir(AI_CACHE_DIR);
      const resolved = path$7.resolve(filePath);
      if (!resolved.startsWith(AI_CACHE_DIR)) return;
      fs$4.writeFileSync(resolved, data, { encoding: "utf-8" });
    } catch (err) {
      console.error("ai:writeCacheFile error:", err);
    }
  }, "ai:writeCacheFile"));
  require$$1$1.ipcMain.handle("ai:deleteCacheFile", wrapHandler((_event, filePath) => {
    try {
      if (!filePath) return;
      const resolved = path$7.resolve(filePath);
      if (!resolved.startsWith(AI_CACHE_DIR)) return;
      if (fs$4.existsSync(resolved)) fs$4.unlinkSync(resolved);
    } catch (err) {
      console.error("ai:deleteCacheFile error:", err);
    }
  }, "ai:deleteCacheFile"));
  require$$1$1.ipcMain.handle("ai:listCacheFiles", wrapHandler(() => {
    try {
      ensureDir(AI_CACHE_DIR);
      return fs$4.readdirSync(AI_CACHE_DIR).filter((name) => name.endsWith(".json"));
    } catch {
      return [];
    }
  }, "ai:listCacheFiles"));
}
function registerSecurityHandlers() {
  require$$1$1.ipcMain.handle("security:getAuthorizedDirs", wrapHandler(() => {
    return getAuthorizedDirs();
  }, "security:getAuthorizedDirs"));
  require$$1$1.ipcMain.handle("security:addAuthorizedDir", wrapHandler((_event, dirPath) => {
    return addAuthorizedDir(dirPath);
  }, "security:addAuthorizedDir"));
  require$$1$1.ipcMain.handle("security:removeAuthorizedDir", wrapHandler((_event, dirPath) => {
    return removeAuthorizedDir(dirPath);
  }, "security:removeAuthorizedDir"));
  require$$1$1.ipcMain.handle("security:isPathAllowed", wrapHandler((_event, filePath) => {
    return isPathAllowed(filePath);
  }, "security:isPathAllowed"));
  require$$1$1.ipcMain.handle("security:isEncryptionAvailable", wrapHandler(() => {
    return isEncryptionAvailable();
  }, "security:isEncryptionAvailable"));
  require$$1$1.ipcMain.handle("security:encryptData", wrapHandler((_event, data) => {
    return encryptString(data);
  }, "security:encryptData"));
  require$$1$1.ipcMain.handle("security:decryptData", wrapHandler((_event, encryptedData) => {
    return decryptString(encryptedData);
  }, "security:decryptData"));
}
let mainWindow$1 = null;
function setMainWindow(win) {
  mainWindow$1 = win;
}
function registerWindowHandlers() {
  require$$1$1.ipcMain.handle("window:show", wrapHandler(() => {
    if (mainWindow$1 && !mainWindow$1.isDestroyed()) {
      mainWindow$1.show();
    }
  }, "window:show"));
  require$$1$1.ipcMain.handle("window:hide", wrapHandler(() => {
    if (mainWindow$1 && !mainWindow$1.isDestroyed()) {
      mainWindow$1.hide();
    }
  }, "window:hide"));
  require$$1$1.ipcMain.handle("window:minimize", wrapHandler(() => {
    if (mainWindow$1 && !mainWindow$1.isDestroyed()) {
      mainWindow$1.minimize();
    }
  }, "window:minimize"));
  require$$1$1.ipcMain.handle("window:maximize", wrapHandler(() => {
    if (mainWindow$1 && !mainWindow$1.isDestroyed()) {
      if (mainWindow$1.isMaximized()) {
        mainWindow$1.unmaximize();
      } else {
        mainWindow$1.maximize();
      }
    }
  }, "window:maximize"));
  require$$1$1.ipcMain.handle("window:close", wrapHandler(() => {
    if (mainWindow$1 && !mainWindow$1.isDestroyed()) {
      mainWindow$1.close();
    }
  }, "window:close"));
  require$$1$1.ipcMain.handle("window:isMaximized", wrapHandler(() => {
    if (mainWindow$1 && !mainWindow$1.isDestroyed()) {
      return mainWindow$1.isMaximized();
    }
    return false;
  }, "window:isMaximized"));
  require$$1$1.ipcMain.handle("window:setupMaximizeListener", wrapHandler(() => {
    if (mainWindow$1 && !mainWindow$1.isDestroyed()) {
      mainWindow$1.on("maximize", () => {
        mainWindow$1 == null ? void 0 : mainWindow$1.webContents.send("window:maximize-change", true);
      });
      mainWindow$1.on("unmaximize", () => {
        mainWindow$1 == null ? void 0 : mainWindow$1.webContents.send("window:maximize-change", false);
      });
    }
  }, "window:setupMaximizeListener"));
  require$$1$1.ipcMain.handle("window:toggleDevTools", wrapHandler(() => {
    if (mainWindow$1 && !mainWindow$1.isDestroyed()) {
      mainWindow$1.webContents.toggleDevTools();
    }
  }, "window:toggleDevTools"));
}
function createFloatWindow(options) {
  const { type: type2, width = 420, height = 560 } = options;
  const display = require$$1$1.screen.getPrimaryDisplay();
  const workArea = display.workArea;
  const posX = workArea.x + workArea.width - width - 20;
  const posY = workArea.y + workArea.height - height - 20;
  const win = new require$$1$1.BrowserWindow({
    width,
    height,
    x: posX,
    y: posY,
    transparent: true,
    backgroundColor: "#00000000",
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path$7.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL + `?float=${type2}`);
  } else {
    win.loadFile(path$7.join(__dirname, "../dist/index.html"), { query: { float: type2 } });
  }
  return win;
}
function injectFloatData(win, type2, data, timeout = 5e3) {
  return new Promise((resolve2) => {
    const channel = `float:${type2}:ready`;
    const dataChannel = `float:${type2}:data`;
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        require$$1$1.ipcMain.removeAllListeners(channel);
        fallbackInject(win, type2, data).then(resolve2);
      }
    }, timeout);
    require$$1$1.ipcMain.once(channel, (event) => {
      if (event.sender === win.webContents && !resolved) {
        resolved = true;
        clearTimeout(timer);
        event.sender.send(dataChannel, data);
        resolve2(true);
      }
    });
  });
}
function fallbackInject(win, type2, data) {
  return new Promise((resolve2) => {
    let dataInjected = false;
    let injectAttempts = 0;
    const maxAttempts = 50;
    const safeJson = JSON.stringify(JSON.stringify(data));
    const funcName = type2 === "reader" ? "setFloatReaderContent" : "setFloatNoteContent";
    const injectInterval = setInterval(() => {
      injectAttempts++;
      if (dataInjected || injectAttempts > maxAttempts) {
        clearInterval(injectInterval);
        resolve2(dataInjected);
        return;
      }
      try {
        if (win.isDestroyed()) {
          clearInterval(injectInterval);
          resolve2(false);
          return;
        }
        win.webContents.executeJavaScript(
          `if (window.${funcName}) { window.${funcName}(JSON.parse(${safeJson})); true; } else { false; }`
        ).then((result) => {
          if (result) {
            dataInjected = true;
            clearInterval(injectInterval);
            resolve2(true);
          }
        }).catch(() => {
        });
      } catch {
        clearInterval(injectInterval);
        resolve2(false);
      }
    }, 100);
  });
}
let floatReaderWin = null;
let floatNoteWin = null;
let floatReaderReturnToMain = true;
let floatNoteReturnToMain = true;
let mainWindowRef = null;
function setMainWindowForFloat(win) {
  mainWindowRef = win;
}
function registerFloatHandlers() {
  require$$1$1.ipcMain.handle("floatReader:create", wrapHandler(async (_event, text, bookTitle, chapterTitle, opacity) => {
    if (floatReaderWin && !floatReaderWin.isDestroyed()) {
      floatReaderWin.close();
      floatReaderWin = null;
    }
    floatReaderWin = createFloatWindow({ type: "reader", width: 420, height: 560 });
    const dataObj = { text, bookTitle, chapterTitle, opacity: opacity || 0.5 };
    await injectFloatData(floatReaderWin, "reader", dataObj);
    floatReaderWin.on("closed", () => {
      floatReaderWin = null;
      if (floatReaderReturnToMain) {
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.show();
        }
      } else {
        require$$1$1.app.quit();
      }
      floatReaderReturnToMain = true;
    });
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.hide();
    }
    return true;
  }, "floatReader:create"));
  require$$1$1.ipcMain.handle("floatReader:close", wrapHandler((_event, returnToMain = true) => {
    floatReaderReturnToMain = returnToMain;
    if (floatReaderWin && !floatReaderWin.isDestroyed()) {
      floatReaderWin.close();
    }
    floatReaderWin = null;
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.show();
    }
  }, "floatReader:close"));
  require$$1$1.ipcMain.handle("floatReader:isOpen", wrapHandler(() => {
    return floatReaderWin != null && !floatReaderWin.isDestroyed();
  }, "floatReader:isOpen"));
  require$$1$1.ipcMain.handle("floatReader:togglePin", wrapHandler(() => {
    if (floatReaderWin && !floatReaderWin.isDestroyed()) {
      const current = floatReaderWin.isAlwaysOnTop();
      floatReaderWin.setAlwaysOnTop(!current);
      return !current;
    }
    return false;
  }, "floatReader:togglePin"));
  require$$1$1.ipcMain.handle("floatNote:create", wrapHandler(async (_event, text, fileName, opacity) => {
    if (floatNoteWin && !floatNoteWin.isDestroyed()) {
      floatNoteWin.close();
      floatNoteWin = null;
    }
    floatNoteWin = createFloatWindow({ type: "note", width: 480, height: 600 });
    const dataObj = { text, fileName, opacity: opacity || 0.85 };
    await injectFloatData(floatNoteWin, "note", dataObj);
    floatNoteWin.on("closed", () => {
      floatNoteWin = null;
      if (floatNoteReturnToMain) {
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.show();
        }
      } else {
        require$$1$1.app.quit();
      }
      floatNoteReturnToMain = true;
    });
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.hide();
    }
    return true;
  }, "floatNote:create"));
  require$$1$1.ipcMain.handle("floatNote:close", wrapHandler((_event, returnToMain = true) => {
    floatNoteReturnToMain = returnToMain;
    if (floatNoteWin && !floatNoteWin.isDestroyed()) {
      floatNoteWin.close();
    }
    floatNoteWin = null;
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.show();
    }
  }, "floatNote:close"));
  require$$1$1.ipcMain.handle("floatNote:isOpen", wrapHandler(() => {
    return floatNoteWin != null && !floatNoteWin.isDestroyed();
  }, "floatNote:isOpen"));
  require$$1$1.ipcMain.handle("floatNote:togglePin", wrapHandler(() => {
    if (floatNoteWin && !floatNoteWin.isDestroyed()) {
      const current = floatNoteWin.isAlwaysOnTop();
      floatNoteWin.setAlwaysOnTop(!current);
      return !current;
    }
    return false;
  }, "floatNote:togglePin"));
  require$$1$1.ipcMain.handle("floatNote:syncContent", wrapHandler((_event, content) => {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.webContents.send("floatNote:contentUpdate", content);
    }
  }, "floatNote:syncContent"));
}
let store = null;
function getStore() {
  if (!store) {
    store = new Store({
      name: "jianyue-reader",
      cwd: require$$1$1.app.getPath("userData")
    });
  }
  return store;
}
function registerStoreHandlers() {
  require$$1$1.ipcMain.handle("store:get", wrapHandler((_event, key) => {
    const s = getStore();
    return s.get(key);
  }, "store:get"));
  require$$1$1.ipcMain.handle("store:set", wrapHandler((_event, key, value) => {
    const s = getStore();
    s.set(key, value);
  }, "store:set"));
}
let pendingFilePath$1 = null;
function setPendingFilePath(filePath) {
  pendingFilePath$1 = filePath;
}
function getPendingFilePath() {
  const fp = pendingFilePath$1;
  pendingFilePath$1 = null;
  return fp;
}
function registerShellHandlers() {
  require$$1$1.ipcMain.handle("shell:showItemInFolder", wrapHandler((_event, filePath) => {
    require$$1$1.shell.showItemInFolder(filePath);
  }, "shell:showItemInFolder"));
  require$$1$1.ipcMain.handle("app:getPath", wrapHandler((_event, name) => {
    return require$$1$1.app.getPath(name);
  }, "app:getPath"));
  require$$1$1.ipcMain.handle("app:getVersion", wrapHandler(() => {
    return require$$1$1.app.getVersion();
  }, "app:getVersion"));
  require$$1$1.ipcMain.handle("app:openCacheFolder", wrapHandler(() => {
    try {
      ensureDir(BASE_DIR);
      require$$1$1.shell.openPath(BASE_DIR);
    } catch (err) {
      console.error("打开缓存目录失败:", err);
    }
  }, "app:openCacheFolder"));
  require$$1$1.ipcMain.handle("app:pendingFilePath", wrapHandler(() => {
    return getPendingFilePath();
  }, "app:pendingFilePath"));
}
function registerClipboardHandlers() {
  require$$1$1.ipcMain.handle("clipboard:writeText", wrapHandler((_event, text) => {
    require$$1$1.clipboard.writeText(text);
  }, "clipboard:writeText"));
  require$$1$1.ipcMain.handle("clipboard:readText", wrapHandler(() => {
    return require$$1$1.clipboard.readText();
  }, "clipboard:readText"));
}
function registerImageHandlers() {
  require$$1$1.ipcMain.handle("image:saveToCache", wrapHandler((_event, base64DataUrl) => {
    try {
      const matches = /^data:image\/([a-z0-9+]+);base64,/i.exec(base64DataUrl);
      if (!matches) return null;
      const ext = matches[1].replace("jpeg", "jpg");
      const now = /* @__PURE__ */ new Date();
      const dateDir = now.toISOString().split("T")[0];
      const targetDir = path$7.join(IMAGES_DIR, dateDir);
      ensureDir(targetDir);
      const timePart = [
        String(now.getHours()).padStart(2, "0"),
        String(now.getMinutes()).padStart(2, "0"),
        String(now.getSeconds()).padStart(2, "0")
      ].join("");
      const randomPart = String(Math.floor(Math.random() * 1e4)).padStart(4, "0");
      const fileName = `image-${timePart}${randomPart}.${ext}`;
      const filePath = path$7.join(targetDir, fileName);
      const base64Data = base64DataUrl.substring(base64DataUrl.indexOf(",") + 1);
      fs$4.writeFileSync(filePath, base64Data, { encoding: "base64" });
      const relativePath = path$7.relative(BASE_DIR, filePath).replace(/\\/g, "/");
      return { filePath, relativePath };
    } catch (err) {
      console.error("保存图片到缓存失败:", err);
      return null;
    }
  }, "image:saveToCache"));
}
function registerAllIpcHandlers() {
  registerStoreHandlers();
  registerFsHandlers();
  registerDialogHandlers();
  registerBookHandlers();
  registerEpubHandlers();
  registerCoverHandlers();
  registerFontHandlers();
  registerAiHandlers();
  registerSecurityHandlers();
  registerWindowHandlers();
  registerFloatHandlers();
  registerShellHandlers();
  registerClipboardHandlers();
  registerImageHandlers();
}
let pendingFilePath = null;
function parseFilePathFromArgs(argv) {
  const supportedExts = /* @__PURE__ */ new Set([".md", ".epub", ".txt", ".mobi", ".azw3", ".cbz", ".cbr"]);
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg && !arg.startsWith("-")) {
      const ext = require("path").extname(arg).toLowerCase();
      if (supportedExts.has(ext)) {
        return arg;
      }
    }
  }
  return null;
}
function processPendingFile(mainWindow2) {
  if (pendingFilePath && mainWindow2 && !mainWindow2.isDestroyed()) {
    mainWindow2.webContents.send("file-open", pendingFilePath);
    pendingFilePath = null;
  }
}
let mainWindow = null;
function createMainWindow() {
  mainWindow = new require$$1$1.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    show: false,
    webPreferences: {
      preload: path$7.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  setMainWindow$1(mainWindow);
  setMainWindow(mainWindow);
  setMainWindowForFloat(mainWindow);
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path$7.join(__dirname, "../dist/index.html"));
  }
  mainWindow.on("ready-to-show", () => {
    mainWindow == null ? void 0 : mainWindow.show();
    processPendingFile(mainWindow);
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
    setMainWindow$1(null);
    setMainWindow(null);
    setMainWindowForFloat(null);
  });
}
require$$1$1.protocol.registerSchemesAsPrivileged([
  { scheme: "cacheimg", privileges: { standard: true, secure: true, supportFetchAPI: true } },
  { scheme: "fontfile", privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);
const gotTheLock = require$$1$1.app.requestSingleInstanceLock();
if (!gotTheLock) {
  require$$1$1.app.quit();
} else {
  require$$1$1.app.on("second-instance", (_event, commandLine) => {
    const filePath = parseFilePathFromArgs(commandLine);
    if (filePath && mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      mainWindow.webContents.send("file-open", filePath);
    }
  });
}
require$$1$1.app.on("open-file", (event, filePath) => {
  event.preventDefault();
  const path2 = require("path");
  const ext = path2.extname(filePath).toLowerCase();
  const supportedExts = /* @__PURE__ */ new Set([".md", ".epub", ".txt", ".mobi", ".azw3", ".cbz", ".cbr"]);
  if (!supportedExts.has(ext)) return;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("file-open", filePath);
  } else {
    pendingFilePath = filePath;
  }
});
require$$1$1.app.whenReady().then(() => {
  setupErrorHandler();
  initDirs();
  initSecurity();
  Store.initRenderer();
  registerAllIpcHandlers();
  if (!pendingFilePath) {
    const filePath = parseFilePathFromArgs(process.argv);
    if (filePath) pendingFilePath = filePath;
  }
  setPendingFilePath(pendingFilePath);
  require$$1$1.protocol.handle("cacheimg", (request) => {
    const urlPath = request.url.replace("cacheimg://", "");
    const decodedPath = decodeURIComponent(urlPath);
    const filePath = path$7.join(BASE_DIR, decodedPath);
    return require$$1$1.net.fetch("file://" + filePath);
  });
  require$$1$1.protocol.handle("fontfile", (request) => {
    try {
      const url = new URL(request.url);
      const encodedPath = url.searchParams.get("path");
      if (!encodedPath) {
        console.error("fontfile protocol: missing path parameter");
        return new Response(null, { status: 400 });
      }
      const filePath = decodeURIComponent(encodedPath);
      const fs2 = require("fs");
      const data = fs2.readFileSync(filePath);
      return new Response(data, {
        headers: { "Content-Type": "font/ttf" }
      });
    } catch (err) {
      console.error("fontfile protocol error:", err);
      return new Response(null, { status: 404 });
    }
  });
  createMainWindow();
  require$$1$1.app.on("activate", () => {
    if (require$$1$1.BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});
require$$1$1.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    require$$1$1.app.quit();
  }
});
