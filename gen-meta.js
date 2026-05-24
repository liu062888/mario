/**
 * Run once to generate .meta files for the Cocos Creator project.
 * Usage: node gen-meta.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function uuid(seed) {
    const h = crypto.createHash('md5').update(seed).digest('hex');
    return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-${((parseInt(h[16],16)&0x3)|0x8).toString(16)}${h.slice(17,20)}-${h.slice(20,32)}`;
}

const root = __dirname;

// ── Directory meta ──────────────────────────────────────────────
function dirMeta(dirPath) {
    return {
        ver: "1.0.1",
        uuid: uuid(dirPath),
        isBundle: dirPath.includes('resources'),
        bundleName: dirPath.includes('resources') ? "resources" : "",
        priority: 1,
        compressionType: {},
        optimizeHotUpdate: {},
        inlineSpriteFrames: {},
        isRemoteBundle: {},
        subMetas: {}
    };
}

// ── TypeScript meta ─────────────────────────────────────────────
function tsMeta(filePath) {
    return {
        ver: "1.0.5",
        uuid: uuid(filePath),
        isPlugin: false,
        loadPluginInWeb: true,
        loadPluginInNative: true,
        loadPluginInEditor: false,
        subMetas: {}
    };
}

// ── Scene meta ──────────────────────────────────────────────────
function sceneMeta(filePath) {
    return {
        ver: "1.0.0",
        uuid: uuid(filePath),
        subMetas: {}
    };
}

// ── Audio meta ──────────────────────────────────────────────────
function audioMeta(filePath) {
    return {
        ver: "1.0.1",
        uuid: uuid(filePath),
        subMetas: {}
    };
}

// ── Texture / PNG meta ──────────────────────────────────────────
function textureMeta(filePath) {
    const base = path.basename(filePath, path.extname(filePath));
    const texUuid = uuid(filePath);
    const frameUuid = uuid(filePath + '#frame');
    return {
        ver: "2.3.5",
        uuid: texUuid,
        type: "sprite",
        wrapMode: "clamp",
        filterMode: "bilinear",
        premultiplyAlpha: false,
        genMipmaps: false,
        packable: true,
        width: 0,
        height: 0,
        platformSettings: {},
        subMetas: {
            [base]: {
                ver: "1.0.4",
                uuid: frameUuid,
                rawTextureUuid: texUuid,
                trimType: "auto",
                trimThreshold: 1,
                rotated: false,
                offsetX: 0,
                offsetY: 0,
                trimX: 0,
                trimY: 0,
                width: 0,
                height: 0,
                rawWidth: 0,
                rawHeight: 0,
                borderTop: 0,
                borderBottom: 0,
                borderLeft: 0,
                borderRight: 0,
                subMetas: {}
            }
        }
    };
}

// ── Plist / SpriteAtlas meta ────────────────────────────────────
function plistMeta(filePath, frames) {
    const subMetas = {};
    for (const f of frames) {
        subMetas[f] = {
            ver: "1.0.4",
            uuid: uuid(filePath + '#' + f),
            rawTextureUuid: uuid(filePath.replace('.plist', '.png')),
            trimType: "auto",
            trimThreshold: 1,
            rotated: false,
            offsetX: 0,
            offsetY: 0,
            trimX: 0,
            trimY: 0,
            width: 0,
            height: 0,
            rawWidth: 0,
            rawHeight: 0,
            borderTop: 0,
            borderBottom: 0,
            borderLeft: 0,
            borderRight: 0,
            subMetas: {}
        };
    }
    return {
        ver: "2.3.3",
        uuid: uuid(filePath),
        isRawAsset: true,
        subMetas
    };
}

// ── Parse plist to get frame names ──────────────────────────────
function parsePlistFrames(plistPath) {
    if (!fs.existsSync(plistPath)) return [];
    const content = fs.readFileSync(plistPath, 'utf8');
    const frames = [];
    const keyRe = /<key>([^<]+\.png)<\/key>/g;
    let m;
    while ((m = keyRe.exec(content)) !== null) {
        // Skip metadata keys
        if (!m[1].includes('FileName') && !m[1].includes('fileName')) {
            frames.push(m[1]);
        }
    }
    return frames;
}

// ── Walk and write metas ────────────────────────────────────────
function writeMeta(targetPath, content) {
    const metaPath = targetPath + '.meta';
    if (!fs.existsSync(metaPath)) {
        fs.writeFileSync(metaPath, JSON.stringify(content, null, 2));
        console.log('Generated:', path.relative(root, metaPath));
    }
}

function processDir(dirPath) {
    const rel = path.relative(root, dirPath);
    writeMeta(dirPath, dirMeta(rel));

    const entries = fs.readdirSync(dirPath);
    for (const entry of entries) {
        if (entry.startsWith('.') || entry.endsWith('.meta')) continue;
        const full = path.join(dirPath, entry);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            processDir(full);
        } else {
            const ext = path.extname(entry).toLowerCase();
            const rel2 = path.relative(root, full);
            if (ext === '.ts') {
                writeMeta(full, tsMeta(rel2));
            } else if (ext === '.fire') {
                writeMeta(full, sceneMeta(rel2));
            } else if (['.mp3', '.wav', '.ogg'].includes(ext)) {
                writeMeta(full, audioMeta(rel2));
            } else if (ext === '.png' || ext === '.jpg') {
                writeMeta(full, textureMeta(rel2));
            } else if (ext === '.plist') {
                const frames = parsePlistFrames(full);
                writeMeta(full, plistMeta(rel2, frames));
            }
        }
    }
}

processDir(path.join(root, 'assets'));
console.log('\nMeta generation complete!');
console.log('Now open the project in Cocos Creator 2.4.8.');
