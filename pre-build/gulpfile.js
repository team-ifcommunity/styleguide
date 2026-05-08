import gulp from "gulp";

import fileinclude from "gulp-file-include";
import * as dartSass from "sass";
import gulpSass from "gulp-sass";
import sourcemaps from "gulp-sourcemaps";
import browserSyncPkg from "browser-sync";
import cached from "gulp-cached";
import autoPrefixer from "gulp-autoprefixer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sass = gulpSass(dartSass);
const browserSync = browserSyncPkg.create();
const isProduction = process.env.NODE_ENV === "production";
const themeStatePath = path.resolve(__dirname, "theme-state.json");
const buildThemeStatePath = path.resolve(__dirname, "../build/theme-state.json");
const validThemes = new Set(["light", "dark"]);

const src = {
    html: ["html/**/*.html", "!html/include/**/*.html"],
    include: ["html/include/*.html"],
    js: "js/**/*.js",
    css: "scss/**/!(_)*.scss",
    cssWatch: "scss/**/*.scss",
    imgs: "assets/**/*",
    public: "public/**/*",
};

const paths = {
    html: "../build/html/",
    include: "../build/html/include/",
    js: "../build/js/",
    css: "../build/css/",
    imgs: "../build/assets/",
    public: "../build/public/",
    themeState: "../build/",
};

const scssOptions = {
    outputStyle: "expanded",
    indentType: "tab",
    indentWidth: 1,
    precision: 6,
    sourceComments: false,
};

function normalizeFilePath(filePath) {
    return path.resolve(filePath).replace(/\\/g, "/");
}

function getChangedScssFilePath(change) {
    if (typeof change === "string") {
        return change;
    }

    if (change && typeof change.path === "string") {
        return change.path;
    }

    return null;
}

function isPartialScssFile(filePath) {
    return path.basename(filePath).startsWith("_");
}

function removeFileIfExists(targetPath) {
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
        fs.unlinkSync(targetPath);
    }
}

function removeDirIfExists(targetPath) {
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
        fs.rmSync(targetPath, { recursive: true, force: true });
    }
}

function getOutputPathFromSource(sourceFilePath, sourceBasePath, outputBasePath) {
    const absoluteSourceBase = path.resolve(__dirname, sourceBasePath);
    const absoluteSourceFile = path.resolve(sourceFilePath);
    const relativePath = path.relative(absoluteSourceBase, absoluteSourceFile);

    return path.resolve(__dirname, outputBasePath, relativePath);
}

function removeMirroredOutputFile(sourceFilePath, sourceBasePath, outputBasePath) {
    const outputPath = getOutputPathFromSource(sourceFilePath, sourceBasePath, outputBasePath);
    removeFileIfExists(outputPath);
}

function removeMirroredOutputDir(sourceDirPath, sourceBasePath, outputBasePath) {
    const absoluteSourceBase = path.resolve(__dirname, sourceBasePath);
    const absoluteSourceDir = path.resolve(sourceDirPath);
    const relativePath = path.relative(absoluteSourceBase, absoluteSourceDir);
    const outputDirPath = path.resolve(__dirname, outputBasePath, relativePath);

    removeDirIfExists(outputDirPath);
}

function getScssEntryFiles() {
    const entryFiles = [];

    function walk(directoryPath) {
        if (!fs.existsSync(directoryPath)) {
            return;
        }

        for (const entry of fs.readdirSync(directoryPath, {
            withFileTypes: true,
        })) {
            const fullPath = path.join(directoryPath, entry.name);

            if (entry.isDirectory()) {
                walk(fullPath);
                continue;
            }

            if (entry.isFile() && entry.name.endsWith(".scss") && !entry.name.startsWith("_")) {
                entryFiles.push(fullPath);
            }
        }
    }

    walk(path.resolve(__dirname, "scss"));

    return entryFiles;
}

function getScssDependencySpecifiers(filePath) {
    const source = fs.readFileSync(filePath, "utf8");
    const specifiers = [];
    const atRulePattern = /@(use|forward|import)\s+([^;]+);/g;

    for (const match of source.matchAll(atRulePattern)) {
        const clause = match[2];
        const quoted = clause.match(/["'][^"']+["']/g) || [];

        for (const token of quoted) {
            const specifier = token.slice(1, -1).trim();

            if (!specifier || specifier.startsWith("sass:") || specifier.endsWith(".css")) {
                continue;
            }

            specifiers.push(specifier);
        }
    }

    return specifiers;
}

function resolveScssDependency(importerFilePath, specifier) {
    const importerDir = path.dirname(importerFilePath);
    const parsed = path.parse(specifier);
    const extension = parsed.ext || ".scss";
    const candidates = [
        path.resolve(importerDir, `${specifier}${parsed.ext ? "" : ".scss"}`),
        path.resolve(importerDir, path.join(parsed.dir, `_${parsed.name}${extension}`)),
        path.resolve(importerDir, path.join(specifier, "_index.scss")),
        path.resolve(importerDir, path.join(specifier, "index.scss")),
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return null;
}

function buildScssDependencyGraph() {
    const graph = new Map();
    const visited = new Set();

    function visit(filePath) {
        const normalizedFilePath = normalizeFilePath(filePath);

        if (visited.has(normalizedFilePath) || !fs.existsSync(filePath)) {
            return;
        }

        visited.add(normalizedFilePath);

        const dependencies = new Set();
        for (const specifier of getScssDependencySpecifiers(filePath)) {
            const resolvedDependency = resolveScssDependency(filePath, specifier);

            if (!resolvedDependency) {
                continue;
            }

            const normalizedDependency = normalizeFilePath(resolvedDependency);
            dependencies.add(normalizedDependency);
            visit(resolvedDependency);
        }

        graph.set(normalizedFilePath, dependencies);
    }

    for (const entryFile of getScssEntryFiles()) {
        visit(entryFile);
    }

    return graph;
}

function entryDependsOnFile(entryFilePath, targetFilePath, dependencyGraph, seen = new Set()) {
    const normalizedEntryFilePath = normalizeFilePath(entryFilePath);
    const normalizedTargetFilePath = normalizeFilePath(targetFilePath);

    if (normalizedEntryFilePath === normalizedTargetFilePath) {
        return true;
    }

    if (seen.has(normalizedEntryFilePath)) {
        return false;
    }

    seen.add(normalizedEntryFilePath);

    for (const dependency of dependencyGraph.get(normalizedEntryFilePath) || []) {
        if (dependency === normalizedTargetFilePath) {
            return true;
        }

        if (entryDependsOnFile(dependency, normalizedTargetFilePath, dependencyGraph, seen)) {
            return true;
        }
    }

    return false;
}

function getScssTargets(change) {
    const changedFilePath = getChangedScssFilePath(change);
    const entryFiles = getScssEntryFiles();

    if (!changedFilePath) {
        return entryFiles;
    }

    const resolvedChangedFilePath = path.resolve(changedFilePath);

    if (!fs.existsSync(resolvedChangedFilePath)) {
        return entryFiles;
    }

    if (!isPartialScssFile(resolvedChangedFilePath)) {
        return [resolvedChangedFilePath];
    }

    const dependencyGraph = buildScssDependencyGraph();

    return entryFiles.filter(function filterImpactedEntry(entryFilePath) {
        return entryDependsOnFile(entryFilePath, resolvedChangedFilePath, dependencyGraph);
    });
}

function removeCompiledCssByScssPath(filePath) {
    if (!filePath) {
        return;
    }

    const absoluteFilePath = path.resolve(filePath);

    if (isPartialScssFile(absoluteFilePath)) {
        return;
    }

    const scssBasePath = path.resolve(__dirname, "scss");
    const relativePath = path.relative(scssBasePath, absoluteFilePath);
    const parsed = path.parse(relativePath);

    const cssOutputPath = path.resolve(__dirname, paths.css, path.join(parsed.dir, `${parsed.name}.css`));
    const cssMapOutputPath = `${cssOutputPath}.map`;

    removeFileIfExists(cssOutputPath);
    removeFileIfExists(cssMapOutputPath);
}

function removeCompiledCssDirByScssDir(dirPath) {
    if (!dirPath) {
        return;
    }

    const scssBasePath = path.resolve(__dirname, "scss");
    const absoluteDirPath = path.resolve(dirPath);
    const relativePath = path.relative(scssBasePath, absoluteDirPath);
    const cssOutputDir = path.resolve(__dirname, paths.css, relativePath);

    removeDirIfExists(cssOutputDir);
}

function normalizeTheme(theme) {
    return validThemes.has(theme) ? theme : "light";
}

function readThemeState() {
    try {
        const raw = fs.readFileSync(themeStatePath, "utf8");
        const parsed = JSON.parse(raw);

        return normalizeTheme(parsed.theme);
    } catch (error) {
        return "light";
    }
}

function writeThemeState(theme) {
    const nextTheme = normalizeTheme(theme);
    fs.writeFileSync(themeStatePath, `${JSON.stringify({ theme: nextTheme }, null, 2)}\n`, "utf8");
    fs.mkdirSync(path.dirname(buildThemeStatePath), { recursive: true });
    fs.writeFileSync(buildThemeStatePath, `${JSON.stringify({ theme: nextTheme }, null, 2)}\n`, "utf8");

    return nextTheme;
}

function writeBuildThemeState(theme) {
    const nextTheme = normalizeTheme(theme);
    fs.mkdirSync(path.dirname(buildThemeStatePath), { recursive: true });
    fs.writeFileSync(buildThemeStatePath, `${JSON.stringify({ theme: nextTheme }, null, 2)}\n`, "utf8");

    return nextTheme;
}

function createHtmlContext() {
    return {
        headerRight: "",
        themeDefault: readThemeState(),
    };
}

function invalidateHtmlCache() {
    delete cached.caches.html;
}

function themeStateCompile() {
    const theme = readThemeState();
    writeBuildThemeState(theme);
    return Promise.resolve();
}

function refreshHtmlFromThemeState() {
    invalidateHtmlCache();
    return htmlComplie();
}

function htmlComplie() {
    return gulp
        .src(src.html)
        .pipe(
            fileinclude({
                prefix: "@@",
                basepath: "@file",
                indent: true,
                context: createHtmlContext(),
            })
        )
        .pipe(cached("html"))
        .pipe(gulp.dest(paths.html))
        .pipe(browserSync.stream());
}

function includeComplie() {
    return gulp.src(src.include).pipe(gulp.dest(paths.include)).pipe(browserSync.stream());
}

function scssCompile(change) {
    const targets = getScssTargets(change);
    const scssBasePath = path.resolve(__dirname, "scss");

    if (targets.length === 0) {
        return Promise.resolve();
    }

    let stream = gulp.src(targets, { allowEmpty: true, base: scssBasePath });

    if (isProduction) {
        stream = stream.pipe(sourcemaps.init());
    }

    stream = stream.pipe(sass(scssOptions).on("error", sass.logError));

    if (isProduction) {
        stream = stream.pipe(autoPrefixer());
    }

    if (isProduction) {
        stream = stream.pipe(sourcemaps.write());
    }

    return stream.pipe(gulp.dest(paths.css)).pipe(browserSync.stream({ match: "**/*.css" }));
}

function concatJs() {
    return gulp.src(src.js).pipe(cached("js")).pipe(gulp.dest(paths.js)).pipe(browserSync.stream());
}

function imgs() {
    return gulp.src(src.imgs, { allowEmpty: true, dot: true, base: "assets" }).pipe(gulp.dest(paths.imgs));
}

function copySingleAsset(filePath) {
    return gulp
        .src(filePath, { allowEmpty: true, dot: true, base: "assets" })
        .pipe(gulp.dest(paths.imgs))
        .pipe(browserSync.stream());
}

function removeAssetOutput(filePath) {
    removeMirroredOutputFile(filePath, "assets", "../build/assets");
}

function removeAssetOutputDir(dirPath) {
    removeMirroredOutputDir(dirPath, "assets", "../build/assets");
}

function syncAssets() {
    const outDir = path.resolve(__dirname, paths.imgs);
    removeDirIfExists(outDir);
    fs.mkdirSync(outDir, { recursive: true });

    return gulp.src(src.imgs, { allowEmpty: true, dot: true, base: "assets" }).pipe(gulp.dest(paths.imgs));
}

function copyPublic() {
    const publicOutDir = path.resolve(__dirname, paths.public);
    fs.mkdirSync(publicOutDir, { recursive: true });

    return gulp
        .src(src.public, { allowEmpty: true, dot: true })
        .pipe(cached("public"))
        .pipe(gulp.dest(paths.public))
        .pipe(browserSync.stream());
}

function removeHtmlOutput(filePath) {
    removeMirroredOutputFile(filePath, "html", "../build/html");
}

function removeIncludeOutput(filePath) {
    removeMirroredOutputFile(filePath, "html/include", "../build/html/include");
}

function removeJsOutput(filePath) {
    removeMirroredOutputFile(filePath, "js", "../build/js");
}

function removeHtmlOutputDir(dirPath) {
    removeMirroredOutputDir(dirPath, "html", "../build/html");
}

function removeIncludeOutputDir(dirPath) {
    removeMirroredOutputDir(dirPath, "html/include", "../build/html/include");
}

function removeJsOutputDir(dirPath) {
    removeMirroredOutputDir(dirPath, "js", "../build/js");
}

function removePublicOutput(filePath) {
    removeMirroredOutputFile(filePath, "public", "../build/public");
}

function removePublicOutputDir(dirPath) {
    removeMirroredOutputDir(dirPath, "public", "../build/public");
}

let htmlBuildTimer = null;

function scheduleHtmlCompile() {
    clearTimeout(htmlBuildTimer);

    htmlBuildTimer = setTimeout(function runScheduledHtmlCompile() {
        invalidateHtmlCache();
        htmlComplie();
    }, 50);
}

function scheduleIncludeAndHtmlCompile() {
    clearTimeout(htmlBuildTimer);

    htmlBuildTimer = setTimeout(function runScheduledIncludeAndHtmlCompile() {
        includeComplie();
        invalidateHtmlCache();
        htmlComplie();
    }, 50);
}

function scheduleThemeStateAndHtmlCompile() {
    clearTimeout(htmlBuildTimer);

    htmlBuildTimer = setTimeout(function runScheduledThemeStateAndHtmlCompile() {
        themeStateCompile();
        invalidateHtmlCache();
        htmlComplie();
    }, 50);
}

function brwSync(done) {
    browserSync.init({
        server: {
            baseDir: "../build/",
            index: "html/00_coding_list.html",
        },
        middleware: [
            function themeStateMiddleware(req, res, next) {
                if (req.url !== "/__styleguide-theme-state") {
                    next();
                    return;
                }

                if (req.method === "GET") {
                    const theme = readThemeState();
                    res.writeHead(200, {
                        "Content-Type": "application/json; charset=utf-8",
                    });
                    res.end(JSON.stringify({ theme }));
                    return;
                }

                if (req.method !== "POST") {
                    res.writeHead(405, {
                        "Content-Type": "application/json; charset=utf-8",
                    });
                    res.end(JSON.stringify({ error: "Method Not Allowed" }));
                    return;
                }

                let body = "";
                req.on("data", function onData(chunk) {
                    body += chunk;
                });

                req.on("end", function onEnd() {
                    try {
                        const parsed = JSON.parse(body || "{}");
                        writeThemeState(parsed.theme);
                        scheduleThemeStateAndHtmlCompile();

                        res.writeHead(200, {
                            "Content-Type": "application/json; charset=utf-8",
                        });
                        res.end(JSON.stringify({ theme: readThemeState() }));
                    } catch (error) {
                        res.writeHead(400, {
                            "Content-Type": "application/json; charset=utf-8",
                        });
                        res.end(JSON.stringify({ error: "Invalid theme payload" }));
                    }
                });
            },
        ],
    });
    done();
}

function watchFiles() {
    const htmlWatcher = gulp.watch(src.html);
    htmlWatcher.on("add", scheduleHtmlCompile);
    htmlWatcher.on("change", scheduleHtmlCompile);
    htmlWatcher.on("unlink", function onHtmlUnlink(filePath) {
        removeHtmlOutput(filePath);
        scheduleHtmlCompile();
    });
    htmlWatcher.on("unlinkDir", function onHtmlDirUnlink(dirPath) {
        removeHtmlOutputDir(dirPath);
        scheduleHtmlCompile();
    });

    const includeWatcher = gulp.watch(src.include);
    includeWatcher.on("add", scheduleIncludeAndHtmlCompile);
    includeWatcher.on("change", scheduleIncludeAndHtmlCompile);
    includeWatcher.on("unlink", function onIncludeUnlink(filePath) {
        removeIncludeOutput(filePath);
        scheduleHtmlCompile();
    });
    includeWatcher.on("unlinkDir", function onIncludeDirUnlink(dirPath) {
        removeIncludeOutputDir(dirPath);
        scheduleHtmlCompile();
    });

    const jsWatcher = gulp.watch(src.js);
    jsWatcher.on("add", concatJs);
    jsWatcher.on("change", concatJs);
    jsWatcher.on("unlink", function onJsUnlink(filePath) {
        removeJsOutput(filePath);
        delete cached.caches.js;
        browserSync.reload();
    });
    jsWatcher.on("unlinkDir", function onJsDirUnlink(dirPath) {
        removeJsOutputDir(dirPath);
        delete cached.caches.js;
        browserSync.reload();
    });

    const imageWatcher = gulp.watch(src.imgs);
    imageWatcher.on("add", copySingleAsset);
    imageWatcher.on("change", copySingleAsset);
    imageWatcher.on("unlink", function onImageUnlink(filePath) {
        removeAssetOutput(filePath);
        browserSync.reload();
    });
    imageWatcher.on("unlinkDir", function onImageDirUnlink(dirPath) {
        removeAssetOutputDir(dirPath);
        browserSync.reload();
    });

    const publicWatcher = gulp.watch(src.public);
    publicWatcher.on("add", copyPublic);
    publicWatcher.on("change", copyPublic);
    publicWatcher.on("unlink", function onPublicUnlink(filePath) {
        removePublicOutput(filePath);
        delete cached.caches.public;
        browserSync.reload();
    });
    publicWatcher.on("unlinkDir", function onPublicDirUnlink(dirPath) {
        removePublicOutputDir(dirPath);
        delete cached.caches.public;
        browserSync.reload();
    });

    const themeWatcher = gulp.watch("theme-state.json");
    themeWatcher.on("change", scheduleThemeStateAndHtmlCompile);

    const scssWatcher = gulp.watch(src.cssWatch);

    function runScssCompileForChange(change) {
        const result = scssCompile(change);
        if (result && typeof result.catch === "function") {
            result.catch(function noop() {});
        }
    }

    scssWatcher.on("add", runScssCompileForChange);
    scssWatcher.on("change", runScssCompileForChange);

    scssWatcher.on("unlink", function onScssUnlink(filePath) {
        removeCompiledCssByScssPath(filePath);
        runScssCompileForChange();
    });

    scssWatcher.on("unlinkDir", function onScssDirUnlink(dirPath) {
        removeCompiledCssDirByScssDir(dirPath);
        runScssCompileForChange();
    });
}

const build = gulp.series(
    gulp.parallel(includeComplie, scssCompile, concatJs, imgs, copyPublic, themeStateCompile),
    htmlComplie,
    gulp.parallel(brwSync, watchFiles)
);

export {
    htmlComplie,
    includeComplie,
    scssCompile,
    concatJs,
    imgs,
    syncAssets,
    copyPublic,
    themeStateCompile,
    refreshHtmlFromThemeState,
    brwSync,
    watchFiles,
};

export default build;
