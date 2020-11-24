// ページの読み込みが完了したらコールバック関数が呼ばれる
// ※コールバック: 第2引数の無名関数(=関数名が省略された関数)
window.addEventListener('load', () => {
  const main_contents = document.querySelector('#main');

  const canvas = document.querySelector('#draw-area');
  const prevImg = document.getElementById('img-prev');

  const copyButton = document.querySelector('#copy-button');
  const startButton = document.querySelector('#start-button');
  const clearButton = document.querySelector('#clear-button');
  const eraserButton = document.querySelector('#eraser-button');

  const prevText = document.getElementById('img-prev-txt');

  // contextを使ってcanvasに絵を書いていく
  const context = canvas.getContext('2d');
  const paletteContext = document.querySelector("#color-palette").getContext('2d');

  // 直前のマウスのcanvas上のx座標とy座標を記録する
  const lastPosition = { x: null, y: null };

  // マウスがドラッグされているか(クリックされたままか)判断するためのフラグ
  let isDrag = false;
  let isErase = false;
  let drawColor = 'black';
  let prevColor = 'black';
  let lineWidth = 5;
  var apigClient = apigClientFactory.newClient();
  let named = false;

  let prevName = "";
  let newKey = '';

  function parse_query() {
    var queryString = location.search;
    var queryObject = {};
    if (queryString) {
      queryString = queryString.substring(1);
      var parameters = queryString.split('&');

      for (var i = 0; i < parameters.length; i++) {
        var element = parameters[i].split('=');

        var paramName = decodeURIComponent(element[0]);
        var paramValue = decodeURIComponent(element[1]);

        queryObject[paramName] = paramValue;
      }
    }
    return queryObject;
  }

  function get_key() {
    var path = location.pathname;
    console.log(path);
    try {      
      key = path.split('/').slice(-1)[0].split('.')[0];
    } catch (error) {
      key = ''; 
    }
    console.log(key);
    return key;
  }

  let sec = 60;
  let timerFlag = 0;
  let timerActive;
  const counter = document.getElementById('counter');
  function count_up() {
    if (timerFlag < 1) {
      return;
    }
    sec -= 1;
    sec_num = ('0' + sec).slice(-2);
    counter.innerHTML = sec_num;
    if (sec < 10) {
      counter.style.color = "red";
    }
    if (sec == 0) {
      timerFlag = -1;
      clearInterval(timerActive);
    }
  };

  function count_start() {
    if (timerFlag == 0) {
      sec = 60;
      // counter.innerHTML = '60';      
      timerFlag = 1;                //動作中にする
      timerActive = setInterval(count_up, 1000);  //カウントを開始
    }
  };

  // ブラウザのデフォルト動作を禁止する関数
  // 指での捜査時に、ビヨーンと画面外が表示される箇所とかを防ぐ
  // ただし、liやbuttonといった色変更や太さ変更や削除機能を持つ
  // 要素は、その動作をさせたいので、デフォルド動作禁止から除外する
  function stopDefault(event) {
    if (event.touches[0].target.tagName.toLowerCase() == "li") { return; }
    if (event.touches[0].target.tagName.toLowerCase() == "input") { return; }

    event.preventDefault();
  }

  // タッチイベントの初期化
  document.addEventListener("touchstart", stopDefault, false);
  document.addEventListener("touchmove", stopDefault, false);
  document.addEventListener("touchend", stopDefault, false);
  // ジェスチャーイベントの初期化
  document.addEventListener("gesturestart", stopDefault, false);
  document.addEventListener("gesturechange", stopDefault, false);
  document.addEventListener("gestureend", stopDefault, false);

  // 絵を書く
  function draw(x, y) {
    // マウスがドラッグされていなかったら処理を中断する。
    // ドラッグしながらしか絵を書くことが出来ない。
    if (!isDrag || timerFlag < 0) {
      return;
    }
    $("#finish-button").prop('disabled', false);

    // 「context.beginPath()」と「context.closePath()」を都度draw関数内で実行するよりも、
    // 線の描き始め(dragStart関数)と線の描き終わり(dragEnd)で1回ずつ読んだほうがより綺麗に線画書ける

    // 線の状態を定義する
    // MDN CanvasRenderingContext2D: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineJoin
    context.lineCap = 'round'; // 丸みを帯びた線にする
    context.lineJoin = 'round'; // 丸みを帯びた線にする
    context.lineWidth = lineWidth; // 線の太さ
    context.strokeStyle = drawColor; // 線の色

    // 書き始めは lastPosition.x, lastPosition.y の値はnullとなっているため、
    // クリックしたところを開始点としている。
    // この関数(draw関数内)の最後の2行で lastPosition.xとlastPosition.yに
    // 現在のx, y座標を記録することで、次にマウスを動かした時に、
    // 前回の位置から現在のマウスの位置まで線を引くようになる。
    if (lastPosition.x === null || lastPosition.y === null) {
      // ドラッグ開始時の線の開始位置
      context.moveTo(x, y);
    } else {
      // ドラッグ中の線の開始位置
      context.moveTo(lastPosition.x, lastPosition.y);
    }
    // context.moveToで設定した位置から、context.lineToで設定した位置までの線を引く。
    // - 開始時はmoveToとlineToの値が同じであるためただの点となる。
    // - ドラッグ中はlastPosition変数で前回のマウス位置を記録しているため、
    //   前回の位置から現在の位置までの線(点のつながり)となる
    context.lineTo(x, y);

    // context.moveTo, context.lineToの値を元に実際に線を引く
    context.stroke();

    // 現在のマウス位置を記録して、次回線を書くときの開始点に使う
    lastPosition.x = x;
    lastPosition.y = y;
  }

  // canvas上に書いた絵を全部消す
  function clear() {
    sec = 60;
    counter.innerHTML = sec;
    timerFlag = 0;
    clearInterval(timerActive);

    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    isErase = false;
    drawColor = prevColor;
    lineWidth = 5;
    document.getElementById('eraser-button').value = '消しゴムモードに切り替え'
    paletteContext.fillStyle = drawColor;
    paletteContext.fillRect(0, 0, 20, 20);
  }

  function changeErase() {
    isErase = !isErase;
    if (isErase) {
      document.getElementById('eraser-button').value = '描画モードに切り替え'
      prevColor = drawColor;
      drawColor = 'white';
      lineWidth = 30;
    } else {
      document.getElementById('eraser-button').value = '消しゴムモードに切り替え'
      drawColor = prevColor;
      lineWidth = 5;
    }
  }

  function upload_picture() {
    clearInterval(timerActive);
    timerFlag = -1;
    $('#finish-button').val('送信中...');

    data = canvas.toDataURL().split(',')[1];
    data = canvas.toDataURL();

    //Base64文字列を画面に表示する    
    name = $('#name-txt').val()

    body = { 'key': prevKey, 'base64': data, 'name': name };

    apigClient.rootPost(null, body)
      .then(function (result) {
        newKey = result['data']['body']
        console.log(newKey)

        copyButton.disabled = false;
        copyButton.style.display = "block"

        // url = 'https://shiritori.site' + '?key=' + newKey;
        url = 'https://shiritori.site/html/' + newKey + '.html';
        outText = prevName + "さんの絵に" + (60 - sec) + "秒で絵しりとりしました！\n #1min絵しりとり\n " + url;
        drawSec = 60 - sec;
        $('#out-text').val(outText);
        $('#out-text').css('display', 'block');
        $("#copy-button").css('display', 'block');
        $('#finish-button').css('display', 'none');
        
        $("#upload-button").css('display', 'none');
        $("#clear-button").css('display', 'none');
        $("#eraser-button").css('display', 'none');
        $("#palette").css('display', 'none');

        setTweetButton(url, drawSec);

        console.log($('#tweet-button').prop('data-url'))
      }).catch(function (result) {
        console.log(result)
      });

  }

  function setTweetButton(url, drawSec) {
    $('#tweet-area').empty(); //既存のボタン消す
    // htmlでスクリプトを読んでるからtwttがエラーなく呼べる
    // オプションは公式よんで。
    console.log(drawSec);
    twttr.widgets.createShareButton(
      url,
      document.getElementById("tweet-area"),
      {
        size: "large", //ボタンはでかく
        text: drawSec + "秒で絵しりとりしました！", // 狙ったテキスト
        hashtags: "1min絵しりとり", // ハッシュタグ
        lang: 'ja'
      }
    );
    console.log(url);
  }

  function load_picture() {
    url = 'https://4w7z9cyyj6.execute-api.ap-northeast-1.amazonaws.com/dev'

    if (prevKey) {
      var xmlHttp = new XMLHttpRequest();
      queryUrl = url + '?key=' + prevKey;
      xmlHttp.open("GET", queryUrl, false); // false for synchronous request
      xmlHttp.send(null);
      res = JSON.parse(xmlHttp.responseText)['body'];
      prevImage = res['img'];
      prevName = res['name'];

      // if (prevImage.split(',').length == 1) {
      //   prevImage = 'data:image/png;base64,' + prevImage;
      // }
      document.getElementById('img-prev').src = prevImage;
      $('#img-prev-txt').text(prevName + 'さんの絵');
    }
  }



  // マウスのドラッグを開始したらisDragのフラグをtrueにしてdraw関数内で
  // お絵かき処理が途中で止まらないようにする
  function dragStart(event) {
    // これから新しい線を書き始めることを宣言する
    // 一連の線を書く処理が終了したらdragEnd関数内のclosePathで終了を宣言する
    context.beginPath();
    count_start();

    clearButton.disabled = false;
    isDrag = true;
  }
  // マウスのドラッグが終了したら、もしくはマウスがcanvas外に移動したら
  // isDragのフラグをfalseにしてdraw関数内でお絵かき処理が中断されるようにする
  function dragEnd(event) {
    // 線を書く処理の終了を宣言する
    context.closePath();
    isDrag = false;

    // 描画中に記録していた値をリセットする
    lastPosition.x = null;
    lastPosition.y = null;
  }

  // タップ位置を取得する為の関数群
  function scrollX() { return document.documentElement.scrollLeft || document.body.scrollLeft; }
  function scrollY() { return document.documentElement.scrollTop || document.body.scrollTop; }
  function getPosT(event) {
    var mouseX = event.touches[0].clientX + scrollX() - canvas.getBoundingClientRect().left;
    var mouseY = event.touches[0].clientY + scrollY() - canvas.getBoundingClientRect().top;

    console.log(event.touches[0].clientY);
    console.log(scrollY());
    console.log(canvas.getBoundingClientRect().top);

    return { x: mouseX, y: mouseY };
  }

  // マウス操作やボタンクリック時のイベント処理を定義する
  function initEventHandler() {
    const palettes = document.querySelectorAll('.palette');
    palettes.forEach((palette) => {
      palette.addEventListener('click', (event) => {
        drawColor = event.target.id.split('-')[1];
        lineWidth = 5;
        document.getElementById('eraser-button').value = '消しゴムモードに切り替え'
        
        paletteContext.fillStyle = drawColor;
        paletteContext.fillRect(0, 0, 20, 20);
      });
    });


    clearButton.addEventListener('click', clear);

    eraserButton.addEventListener('click', changeErase);

    canvas.addEventListener('touchstart', dragStart);
    canvas.addEventListener('touchend', dragEnd);
    canvas.addEventListener('touchmove', (event) => {
      event.preventDefault();
      pos = getPosT(event)
      draw(pos.x, pos.y);
    });
    canvas.addEventListener('mousedown', dragStart);
    canvas.addEventListener('mouseup', dragEnd);
    canvas.addEventListener('mouseout', dragEnd);
    canvas.addEventListener('mousemove', (event) => {
      draw(event.layerX, event.layerY);
    });

    copyButton.addEventListener('click', (event) => {
      named = true;
      var copyText = document.querySelector("#out-text");
      copyText.disabled = false;
      copyText.select();
      copyText.disabled = true;
      document.execCommand("copy");
    });

    startButton.addEventListener('click', (event) => {
      document.getElementById("palette-area").style.display = "block";
      startButton.style.display = "none";
    });

    $("#finish-button").on('click', upload_picture);

    $('#name-txt').focusin(function () {
      if (!named) {
        $(this).val('');
        $(this).css('color', 'black');
        named = true;
      }
    });
    $('#name-txt').focusout(function () {
      if ($(this).val() == '' || $(this).val() == '名無し') {
        named = false;
        $(this).val('名無し');
        $(this).css('color', 'gray');
      }
    });



  }

  size = Math.min(document.documentElement.clientWidth - 50, document.documentElement.clientHeight - 50, 500)
  main_contents.width = size;
  canvas.width = size;
  canvas.height = size;

  // prevKey = parse_query()['key']
  prevKey = get_key();

  if (prevKey) {
    prevImg.width = size;
    prevImg.height = size;
  } else {
    prevImg.width = 0;
    prevImg.height = 0;
    prevText.innerHTML = '';
  }
  var targetImg = document.getElementById('title_img');
  var orgWidth  = targetImg.width;  // 元の横幅を保存
  var orgHeight = targetImg.height; // 元の高さを保存
  targetImg.width = Math.min(size, orgWidth);  // 横幅を400pxにリサイズ
  targetImg.height = orgHeight * (targetImg.width / orgWidth); // 高さを横幅の変化割合に合わせる

  $('#main').css('width', size);
  $('#name-txt').css('width', Math.min(size - 20, 150));



  load_picture();
  $("#palette-area").css('display', 'none');
  copyButton.style.display = "none";
  $("#upload-button").css('display', 'none');
  $("#out-text").css('display', 'none');

  clear();

  // イベント処理を初期化する
  initEventHandler();
});