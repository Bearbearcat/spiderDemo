var http = require("http"),
  url = require("url"),
  superagent = require("superagent"),
  cheerio = require("cheerio"),
  async = require("async"),
  eventproxy = require('eventproxy');

var ep = new eventproxy();

var catchFirstUrl = 'https://vue-js.com',	//入口页面
  deleteRepeat = {},	//去重哈希数组
  urlsArray = [],	//存放爬取网址
  catchData = [],	//存放爬取数据
  pageUrls = [],	//存放收集文章页面网站
  pageNum = 2,	//要爬取文章的页数
  startDate = new Date(),	//开始时间
  endDate = false;	//结束时间
//随机获取200页内的一个页面的文章数


const randomNum = (m, n) => {
  var num = Math.floor(Math.random() * (m - n) + n);
  return num;
}
const randomPage = randomNum(1, 201)
pageUrls.push(catchFirstUrl + '?tab=all&page=' + randomPage);

/* for (var i = 1; i <= pageNum; i++) {
  pageUrls.push(catchFirstUrl + '?tab=all&page=' + i);
} */

const start = () => {
  console.log('当前爬取的数据是第' + randomPage + '页')
  function onRequest(req, res) {
    pageUrls.forEach(function (pageUrl) {
      superagent.get(pageUrl)
        .end(function (err, pres) {
          if (err) { return console.log('发生错误', err) }
          // pres.text 里面存储着请求返回的 html 内容，将它传给 cheerio.load 之后
          // 就可以得到一个实现了 jquery 接口的变量，我们习惯性地将它命名为 `$`
          // 剩下就都是利用$ 使用 jquery 的语法了
          const $ = cheerio.load(pres.text);
          const curPageUrls = $('#topic_list .topic_title');
          for (let i = 0; i < curPageUrls.length; i++) {
            const articleUrl = catchFirstUrl + curPageUrls.eq(i).attr('href');
            urlsArray.push(articleUrl);
            // 相当于一个计数器
            ep.emit('BlogArticleHtml', articleUrl);
          }
        })
    })
    ep.after('BlogArticleHtml', pageUrls.length * 20, function (articleUrls) {
      // 当所有 'BlogArticleHtml' 事件完成后的回调触发下面事件
      // 控制并发数
      var curCount = 0;
      const reptileMove = function (url, callback) {
        //延迟毫秒数
        var delay = parseInt((Math.random() * 30000000) % 1000, 10);
        curCount++;
        console.log('现在的并发数是', curCount, '，正在抓取的是', url, '，耗时' + delay + '毫秒');
        superagent.get(url)
          .end(function (err, pres) {
            var $ = cheerio.load(pres.text);
            const title = $('.topic_full_title').eq(0).text().replace(/\n/g, '').trim()
            const date = $('.changes span').eq(0).text().replace(/\n/g, '').trim()
            const author = $('.changes span').eq(1).text().replace(/\n/g, '').trim()
            const seeNum = $('.changes span').eq(2).text().replace(/\n/g, '').trim()
            const score = $('.floor .big').eq(0).text().replace(/\n/g, '').trim()
            const textObj = {
              title,
              score, date, author, seeNum
            }
            catchData.push(textObj)
          })
        setTimeout(function () {
          curCount--;
          callback(null, url + 'Call back content');
        }, delay);
      }
      // 使用async控制异步抓取   
      // mapLimit(arr, limit, iterator, [callback])
      // 异步回调
      async.mapLimit(articleUrls, 5, function (url, callback) {
        reptileMove(url, callback);
      }, function (err, result) {
        // 4000 个 URL 访问完成的回调函数
        // ...
        console.log('爬取完成')
      });
    });
  }
  http.createServer(onRequest).listen(3000);
}
start();
// exports.start = start;