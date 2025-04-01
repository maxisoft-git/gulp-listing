'use strict';

const through = require('through2');
const path = require('path');
const gutil = require('gulp-util');
const fs = require('fs');
const puppeteer = require('puppeteer');
const crypto = require('crypto');

const PluginError = gutil.PluginError;
const File = gutil.File;

const headPath = path.join(__dirname, 'head.html');
const footerPath = path.join(__dirname, 'footer.html');
const cacheDir = path.join(__dirname, '.cache');
let headContent = '';
let footerContent = '';

if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir);
}

try {
    headContent = fs.readFileSync(headPath);
    footerContent = fs.readFileSync(footerPath);
} catch (err) {
    console.error('Error reading head.html or footer.html:', err);
}

module.exports = function(file, opt) {
    if (!file) {
        throw new PluginError('gulp-listing', 'Missing file option for gulp-listing');
    }

    opt = opt || {};

    const placeholderPath = opt.placeholder || path.join(__dirname, 'placeholder.png');
    let placeholderBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAgAB/4b4+EAAAAASUVORK5CYII=';

    if (fs.existsSync(placeholderPath)) {
        try {
            placeholderBase64 = fs.readFileSync(placeholderPath, { encoding: 'base64' });
        } catch (err) {
            console.error('Error reading placeholder image:', err);
        }
    }

    let fileName;
    let latestFile;
    let latestMod;
    let fileLinks = [];
    let linkName = '';

    if (typeof file === 'string') {
        fileName = file;
    } else if (typeof file.path === 'string') {
        fileName = path.basename(file.path);
    } else {
        throw new PluginError('gulp-listing', 'Missing path in file options for gulp-listing');
    }

    async function bufferContents(file, enc, cb) {
        // Пропускаем index.html
        const basename = path.basename(file.path);
        if (basename.toLowerCase() === 'index.html') {
            cb();
            return;
        }

        if (file.isNull()) {
            cb();
            return;
        }

        if (file.isStream()) {
            this.emit('error', new PluginError('gulp-listing', 'Streaming not supported'));
            cb();
            return;
        }

        if (!latestMod || file.stat && file.stat.mtime > latestMod) {
            latestFile = file;
            latestMod = file.stat && file.stat.mtime;
        }

        linkName = (/<title>(.*)<\/title>/i.exec(file.contents.toString()));
        linkName = linkName === null ? '' : linkName[1];

        // Генерация хеша с учетом времени модификации файла
        const fileHash = crypto.createHash('md5')
            .update(file.path + file.stat.mtimeMs)
            .digest('hex');
        const cachedScreenshotPath = path.join(cacheDir, `${fileHash}.png`);

        let screenshotBase64 = '';

        if (fs.existsSync(cachedScreenshotPath)) {
            try {
                screenshotBase64 = fs.readFileSync(cachedScreenshotPath, { encoding: 'base64' });
            } catch (err) {
                console.error(`Error reading cached screenshot for ${file.path}:`, err);
            }
        } else {
            // Очистка устаревших скриншотов для этого файла
            const oldCachePattern = path.basename(file.path, '.html') + '_';
            fs.readdirSync(cacheDir)
                .filter(f => f.startsWith(oldCachePattern))
                .forEach(f => fs.unlinkSync(path.join(cacheDir, f)));

            let browser;
            try {
                browser = await puppeteer.launch({
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
                const page = await browser.newPage();
                await page.setViewport({ width: 1920, height: 1080 });
                await page.goto(`file://${file.path}`, { waitUntil: 'networkidle2' });
                screenshotBase64 = await page.screenshot({ encoding: 'base64', fullPage: true });

                fs.writeFileSync(cachedScreenshotPath, screenshotBase64, { encoding: 'base64' });
            } catch (err) {
                console.error(`Error generating screenshot for ${file.path}:`, err);
                screenshotBase64 = placeholderBase64;
            } finally {
                if (browser) {
                    await browser.close();
                }
            }
        }

        const cardHtml = `
          <a href="${file.relative}" class="card-link">
            <div class="card">
                <div class="card-preview">
                    <img src="data:image/png;base64,${screenshotBase64}" alt="Preview" style="width: 100%; height: auto;">
                </div>
                <div class="card-title">${linkName}</div>
            </div>
          </a>
        `;
        fileLinks.push(cardHtml);

        cb();
    }

    function endStream(cb) {
        if (!latestFile || fileLinks.length === 0) {
            cb();
            return;
        }

        let joinedFile;

        if (typeof file === 'string') {
            joinedFile = latestFile.clone({ contents: false });
            joinedFile.path = path.join(latestFile.base, file);
        } else {
            joinedFile = new File(file);
        }

        const finalContents = headContent.toString() + fileLinks.join('') + footerContent.toString();
        joinedFile.contents = Buffer.from(finalContents);

        this.push(joinedFile);

        cb();
    }

    return through.obj(bufferContents, endStream);
};