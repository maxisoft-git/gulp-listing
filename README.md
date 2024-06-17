# gulp-listing
Генерирует список HTML-файлов

## Установить
### npm
```
    npm install gulp-listing --save 
```

## Использовать
```javascript
    var listing = require('gulp-listing');
    
    gulp.task('scripts', function() {
      return gulp.src('./src/*.html')
        .pipe(listing('listing.html'))
        .pipe(gulp.dest('./src/'));
    });
```

## означать
>1.Сгенерированный список ссылок, адрес ссылки - это относительный путь к HTML-файлу, а название ссылки - это текст в теге `<title></title>' в HTML-файле；

>2.В настоящее время он поддерживает только генерацию файлов манифеста в папку, где находится текущий HTML-файл.

