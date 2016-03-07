# gulp-listing
生成HTML文件清单

## 安装
### npm
```
    npm install gulp-listing --save 
```

## 使用
```javascript
    var listing = require('gulp-listing');
    
    gulp.task('scripts', function() {
      return gulp.src('./src/*.html')
        .pipe(listing('listing.html'))
        .pipe(gulp.dest('./src/'));
    });
```

## 说明
>1.生成的链接列表，链接地址为HTML文件相对路径，链接名称为HTML文件中的 `<title></title>` 标记内的文本；

>2.目前只支持清单文件生成到当前HTML文件所在的文件夹。

