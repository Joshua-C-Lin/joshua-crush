// 當頁面家在完成後執行以下程式
window.onload = function () {
  // 宣告 canvas 以及 context
  const canvas = document.getElementById("game-board");
  const context = canvas.getContext("2d");

  const playerName = "Joshua";

  // FPS 初始化參數
  let lastFrame = 0;
  let fpsTime = 0;
  let frameCount = 0;
  let fps = 0;

  // 滑鼠拖曳
  let drag = false;

  // 宣告 klotski 物件
  const klotski = {
    x: 240,
    y: 113,
    columns: 8,
    rows: 8,
    tileWidth: 40,
    tileHeight: 40,
    tiles: [],
    selectedTile: { selected: false, column: 0, row: 0 },
  };

  // 磁磚顏色
  const tileColors = [
    [255, 128, 128],
    [128, 255, 128],
    [128, 128, 255],
    [255, 255, 128],
    [255, 128, 255],
    [128, 255, 255],
    [255, 255, 255],
  ];

  // 當前分數
  let score = 0;

  // 選定的配對與移動
  let clusters = []; // { column, row, length, horizontal }
  let moves = []; // { column1, row1, column2, row2 }

  // 當前移動
  let currentMove = { column1: 0, row1: 0, column2: 0, row2: 0 };

  // 遊戲狀態
  let gameStates = { init: 0, ready: 1, resolve: 2 };
  let gameState = gameStates.init;

  // 動畫相關變數
  let animationState = 0;
  let animationTime = 0;
  let animationTimeTotal = 0.3;

  // 呈現符合規範的移動
  let showMoves = false;

  // 遊戲結束
  let gameOver = false;

  // 按鈕組
  const buttons = [
    { x: 30, y: 240, width: 150, height: 50, text: "新開局" },
    { x: 30, y: 300, width: 150, height: 50, text: "提示" },
  ];

  // 初始化遊戲
  function init() {
    // 滑鼠監聽
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseout", onMouseOut);

    // 初始化磁磚組
    for (var i = 0; i < klotski.columns; i++) {
      klotski.tiles[i] = [];
      for (var j = 0; j < klotski.rows; j++) {
        // 定義動畫的類型和移位參數
        klotski.tiles[i][j] = { type: 0, shift: 0 };
      }
    }

    // 新開局
    newGame();

    // 呼叫主迴圈
    main(0);
  }

  // 主迴圈
  function main(tFrame) {
    // 動畫請求
    window.requestAnimationFrame(main);

    // 更新和渲染遊戲
    update(tFrame);
    render();
  }

  // 更新遊戲狀態
  function update(tFrame) {
    const dt = (tFrame - lastFrame) / 1000;
    lastFrame = tFrame;

    // 更新 fps
    updateFps(dt);

    // 如果遊戲準備完成
    if (gameState == gameStates.ready) {
      // 判斷遊戲是否結束
      if (moves.length <= 0) {
        gameOver = true;
      }
    } else if (gameState == gameStates.resolve) {
      // 遊戲正在解析動畫資料
      animationTime += dt;

      if (animationState == 0) {
        // 需要找到並消除配對
        if (animationTime > animationTimeTotal) {
          // 尋找配對
          findClusters();

          if (clusters.length > 0) {
            // 更新得分
            for (var i = 0; i < clusters.length; i++) {
              // 一次消除大量的額外得分
              score += 100 * (clusters[i].length - 2);
            }

            // 消除配對
            removeClusters();

            // 磁磚轉移
            animationState = 1;
          } else {
            // 未找到配對 動畫完成
            gameState = gameStates.ready;
          }
          animationTime = 0;
        }
      } else if (animationState == 1) {
        // 磁磚需要互換
        if (animationTime > animationTimeTotal) {
          // 磁磚互換
          shiftTiles();

          // 初始化準備去找新的配對
          animationState = 0;
          animationTime = 0;

          // 尋找新的配對
          findClusters();
          if (clusters.length <= 0) {
            // 動畫完成
            gameState = gameStates.ready;
          }
        }
      } else if (animationState == 2) {
        // 交換磁磚動畫
        if (animationTime > animationTimeTotal) {
          // 交換磁磚
          swap(
            currentMove.column1,
            currentMove.row1,
            currentMove.column2,
            currentMove.row2
          );

          // 檢查交換後是否配對
          findClusters();
          if (clusters.length > 0) {
            // 有效交換 準備動畫狀態
            animationState = 0;
            animationTime = 0;
            gameState = gameStates.resolve;
          } else {
            // 配對失敗 換回動畫
            animationState = 3;
            animationTime = 0;
          }

          // 尋找移動和配對
          findMoves();
          findClusters();
        }
      } else if (animationState == 3) {
        // 換回動畫
        if (animationTime > animationTimeTotal) {
          // 無效交換 換回去
          swap(
            currentMove.column1,
            currentMove.row1,
            currentMove.column2,
            currentMove.row2
          );

          // 動畫完成
          gameState = gameStates.ready;
        }
      }

      // 尋找移動和配對
      findMoves();
      findClusters();
    }
  }

  // 更新 fps
  function updateFps(dt) {
    if (fpsTime > 0.25) {
      // 配對 fps
      fps = Math.round(frameCount / fpsTime);

      // 重置時間與幀數
      fpsTime = 0;
      frameCount = 0;
    }

    // 增加時間與幀數
    fpsTime += dt;
    frameCount++;
  }

  // 繪製置中的文本
  function drawCenterText(text, x, y, width) {
    const textDim = context.measureText(text);
    context.fillText(text, x + (width - textDim.width) / 2, y);
  }

  // 渲染遊戲
  function render() {
    // 繪製外框
    drawFrame();

    // 繪製分數
    context.fillStyle = "#000000";
    context.font = "24px Verdana";
    drawCenterText("Score:", 30, klotski.y + 40, 150);
    drawCenterText(score.toLocaleString(), 30, klotski.y + 70, 150);

    // 繪製按鈕
    drawButtons();

    // 繪製背景
    let klotskiWidth = klotski.columns * klotski.tileWidth;
    let klotskiHeight = klotski.rows * klotski.tileHeight;
    context.fillStyle = "#000000";
    context.fillRect(
      klotski.x - 4,
      klotski.y - 4,
      klotskiWidth + 8,
      klotskiHeight + 8
    );

    // 渲染磁磚
    renderTiles();

    // 渲染配對顯示消除特效
    // renderClusters();

    // 渲染移動 黨沒有配對時
    if (showMoves && clusters.length <= 0 && gameState == gameStates.ready) {
      renderMoves();
    }

    // 遊戲結束呈現
    if (gameOver) {
      context.fillStyle = "rgba(0, 0, 0, 0.8)";
      context.fillRect(klotski.x, klotski.y, klotskiWidth, klotskiHeight);

      context.fillStyle = "#ffffff";
      context.font = "24px Verdana";
      drawCenterText(
        `🎉 Winner - ${playerName} 🎉`,
        klotski.x,
        klotski.y + klotskiHeight / 2 + 10,
        klotskiWidth
      );
    }
  }

  // 繪製邊框
  function drawFrame() {
    // 繪製背景與邊框
    context.fillStyle = "#d0d0d0";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#e8eaec";
    context.fillRect(1, 1, canvas.width - 2, canvas.height - 2);

    // 繪製 header
    context.fillStyle = "#303030";
    context.fillRect(0, 0, canvas.width, 65);

    // 繪製 title
    context.fillStyle = "#ffffff";
    context.font = "24px Verdana";
    context.fillText("Joshua Crush", 10, 30);

    // 繪製 fps
    context.fillStyle = "#ffffff";
    context.font = "12px Verdana";
    context.fillText("Fps: " + fps, 13, 50);
  }

  // 繪製按鈕
  function drawButtons() {
    for (var i = 0; i < buttons.length; i++) {
      // 繪製按鈕形狀
      context.fillStyle = "#000000";
      context.fillRect(
        buttons[i].x,
        buttons[i].y,
        buttons[i].width,
        buttons[i].height
      );

      // 繪製按鈕文字
      context.fillStyle = "#ffffff";
      context.font = "18px Verdana";
      var textDim = context.measureText(buttons[i].text);
      context.fillText(
        buttons[i].text,
        buttons[i].x + (buttons[i].width - textDim.width) / 2,
        buttons[i].y + 30
      );
    }
  }

  // 渲染磁磚
  function renderTiles() {
    for (var i = 0; i < klotski.columns; i++) {
      for (var j = 0; j < klotski.rows; j++) {
        // 獲取動畫的位移
        let shift = klotski.tiles[i][j].shift;

        // 計算磁磚坐標
        let coord = getTileCoordinate(
          i,
          j,
          0,
          (animationTime / animationTimeTotal) * shift
        );

        // 檢查是否存在磁磚
        if (klotski.tiles[i][j].type >= 0) {
          // 取得磁磚顏色
          let col = tileColors[klotski.tiles[i][j].type];

          // 繪製磁磚顏色
          drawTile(coord.tileX, coord.tileY, col[0], col[1], col[2]);
        }

        // 繪製被選中的磁磚
        if (klotski.selectedTile.selected) {
          if (
            klotski.selectedTile.column == i &&
            klotski.selectedTile.row == j
          ) {
            // 繪製一個紅色磁磚
            drawTile(coord.tileX, coord.tileY, 255, 0, 0);
          }
        }
      }
    }

    // 繪製交換動畫
    if (
      gameState == gameStates.resolve &&
      (animationState == 2 || animationState == 3)
    ) {
      // 計算 X 和 Y 位移
      let shiftX = currentMove.column2 - currentMove.column1;
      let shiftY = currentMove.row2 - currentMove.row1;

      // 第一塊磁磚
      let coord1 = getTileCoordinate(
        currentMove.column1,
        currentMove.row1,
        0,
        0
      );
      let coord1shift = getTileCoordinate(
        currentMove.column1,
        currentMove.row1,
        (animationTime / animationTimeTotal) * shiftX,
        (animationTime / animationTimeTotal) * shiftY
      );
      let col1 =
        tileColors[klotski.tiles[currentMove.column1][currentMove.row1].type];

      // 第二塊磁磚
      let coord2 = getTileCoordinate(
        currentMove.column2,
        currentMove.row2,
        0,
        0
      );
      let coord2shift = getTileCoordinate(
        currentMove.column2,
        currentMove.row2,
        (animationTime / animationTimeTotal) * -shiftX,
        (animationTime / animationTimeTotal) * -shiftY
      );
      let col2 =
        tileColors[klotski.tiles[currentMove.column2][currentMove.row2].type];

      // 繪製黑色背景
      drawTile(coord1.tileX, coord1.tileY, 0, 0, 0);
      drawTile(coord2.tileX, coord2.tileY, 0, 0, 0);

      // 根據動畫狀態更改順序
      if (animationState == 2) {
        // 繪製磁磚
        drawTile(
          coord1shift.tileX,
          coord1shift.tileY,
          col1[0],
          col1[1],
          col1[2]
        );
        drawTile(
          coord2shift.tileX,
          coord2shift.tileY,
          col2[0],
          col2[1],
          col2[2]
        );
      } else {
        // 繪製磁磚
        drawTile(
          coord2shift.tileX,
          coord2shift.tileY,
          col2[0],
          col2[1],
          col2[2]
        );
        drawTile(
          coord1shift.tileX,
          coord1shift.tileY,
          col1[0],
          col1[1],
          col1[2]
        );
      }
    }
  }

  // 取得磁磚坐標
  function getTileCoordinate(column, row, columnOffSet, rowOffSet) {
    let tileX = klotski.x + (column + columnOffSet) * klotski.tileWidth;
    let tileY = klotski.y + (row + rowOffSet) * klotski.tileHeight;
    return { tileX: tileX, tileY: tileY };
  }

  // 繪製磁磚顏色 rgb 帶入
  function drawTile(x, y, r, g, b) {
    context.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
    context.fillRect(
      x + 2,
      y + 2,
      klotski.tileWidth - 4,
      klotski.tileHeight - 4
    );
  }

  // 渲染配對顯示消除特效
  function renderClusters() {
    for (var i = 0; i < clusters.length; i++) {
      // 計算磁磚座標
      let coord = getTileCoordinate(clusters[i].column, clusters[i].row, 0, 0);

      if (clusters[i].horizontal) {
        // 消除提示 畫一條水平線
        context.fillStyle = "#B3D9D9";
        context.fillRect(
          coord.tileX + klotski.tileWidth / 2,
          coord.tileY + klotski.tileHeight / 2 - 4,
          (clusters[i].length - 1) * klotski.tileWidth,
          8
        );
      } else {
        // 消除提示 畫一條垂直線
        context.fillStyle = "#B3D9D9";
        context.fillRect(
          coord.tileX + klotski.tileWidth / 2 - 4,
          coord.tileY + klotski.tileHeight / 2,
          8,
          (clusters[i].length - 1) * klotski.tileHeight
        );
      }
    }
  }

  // 渲染位移
  function renderMoves() {
    for (var i = 0; i < moves.length; i++) {
      // 計算磁磚 1 和 2 的坐標
      let coord1 = getTileCoordinate(moves[i].column1, moves[i].row1, 0, 0);
      let coord2 = getTileCoordinate(moves[i].column2, moves[i].row2, 0, 0);

      // 從磁磚 1 到 2 連一條線
      context.strokeStyle = "#ff0000";
      context.beginPath();
      context.moveTo(
        coord1.tileX + klotski.tileWidth / 2,
        coord1.tileY + klotski.tileHeight / 2
      );
      context.lineTo(
        coord2.tileX + klotski.tileWidth / 2,
        coord2.tileY + klotski.tileHeight / 2
      );
      context.stroke();
    }
  }

  // 新開局
  function newGame() {
    // 重置得分
    score = 0;

    // 重置 gameState 到 ready
    gameState = gameStates.ready;

    // 重置 GameOver 狀態
    gameOver = false;

    // 創建 klotski
    createKlotski();

    // 尋找初始移動與配對
    findMoves();
    findClusters();
  }

  // 創建隨機 klotski
  function createKlotski() {
    let done = false;

    // 不斷生成 klotski 直到它是正確的
    while (!done) {
      // 用隨機的磁磚組成 klotski
      for (var i = 0; i < klotski.columns; i++) {
        for (var j = 0; j < klotski.rows; j++) {
          klotski.tiles[i][j].type = getRandomTile();
        }
      }

      // 消除配對
      resolveClusters();

      // 檢查是否有有效移動
      findMoves();

      // 當有有效移動時完成
      if (moves.length > 0) {
        done = true;
      }
    }
  }

  // 取得隨機磁磚
  function getRandomTile() {
    return Math.floor(Math.random() * tileColors.length);
  }

  // 移除配對並補充磁磚
  function resolveClusters() {
    // 檢查配對
    findClusters();

    // 當還有配對的時候
    while (clusters.length > 0) {
      // 移除配對
      removeClusters();

      // 互換磁磚
      shiftTiles();

      // 搜尋是否還有配對
      findClusters();
    }
  }

  // 在 klotski 中尋找配對
  function findClusters() {
    // 初始化配對資料
    clusters = [];

    // 尋找水平配對
    for (var j = 0; j < klotski.rows; j++) {
      // 從單個磁磚開始判斷 1
      let matchLength = 1;
      for (var i = 0; i < klotski.columns; i++) {
        let checkCluster = false;

        if (i == klotski.columns - 1) {
          // 最後一塊磁磚
          checkCluster = true;
        } else {
          // 檢查下一塊磁磚的 type
          if (
            klotski.tiles[i][j].type == klotski.tiles[i + 1][j].type &&
            klotski.tiles[i][j].type != -1
          ) {
            // 如果與上一塊磁磚 type 相同 =〉matchLength + 1
            matchLength += 1;
          } else {
            // type 不同
            checkCluster = true;
          }
        }

        // 檢查是否有配對
        if (checkCluster) {
          if (matchLength >= 3) {
            // 發現水平配對
            clusters.push({
              column: i + 1 - matchLength,
              row: j,
              length: matchLength,
              horizontal: true,
            });
          }

          matchLength = 1;
        }
      }
    }

    // 尋找垂直配對
    for (var i = 0; i < klotski.columns; i++) {
      // 從單個磁磚開始判斷 1
      let matchLength = 1;
      for (var j = 0; j < klotski.rows; j++) {
        let checkCluster = false;

        if (j == klotski.rows - 1) {
          // 最後一塊磁磚
          checkCluster = true;
        } else {
          // 檢查下一塊磁磚的 type
          if (
            klotski.tiles[i][j].type == klotski.tiles[i][j + 1].type &&
            klotski.tiles[i][j].type != -1
          ) {
            // 如果與上一塊磁磚 type 相同 =〉matchLength + 1
            matchLength += 1;
          } else {
            // type 不同
            checkCluster = true;
          }
        }

        // 檢查是否有配對
        if (checkCluster) {
          if (matchLength >= 3) {
            // 發現垂直配對
            clusters.push({
              column: i,
              row: j + 1 - matchLength,
              length: matchLength,
              horizontal: false,
            });
          }

          matchLength = 1;
        }
      }
    }
  }

  // 搜尋有效移動
  function findMoves() {
    // 剩餘有效移動
    moves = [];

    // 檢查水平互換
    for (var j = 0; j < klotski.rows; j++) {
      for (var i = 0; i < klotski.columns - 1; i++) {
        // 互換 查找配對的並交換回來
        swap(i, j, i + 1, j);
        findClusters();
        swap(i, j, i + 1, j);

        // 檢查如果互換後配對成功
        if (clusters.length > 0) {
          // 發現有效位移
          moves.push({ column1: i, row1: j, column2: i + 1, row2: j });
        }
      }
    }

    // 檢查垂直互換
    for (var i = 0; i < klotski.columns; i++) {
      for (var j = 0; j < klotski.rows - 1; j++) {
        // 互換 查找配對的並交換回來
        swap(i, j, i, j + 1);
        findClusters();
        swap(i, j, i, j + 1);

        // 檢查如果互換後配對成功
        if (clusters.length > 0) {
          // 發現有效位移
          moves.push({ column1: i, row1: j, column2: i, row2: j + 1 });
        }
      }
    }

    // 剩下的配對
    clusters = [];
  }

  // 循環配對的磁磚並執行
  function loopClusters(func) {
    for (var i = 0; i < clusters.length; i++) {
      //  { column, row, length, horizontal }
      var cluster = clusters[i];
      var cOffSet = 0;
      var rOffSet = 0;
      for (var j = 0; j < cluster.length; j++) {
        func(i, cluster.column + cOffSet, cluster.row + rOffSet, cluster);

        if (cluster.horizontal) {
          cOffSet++;
        } else {
          rOffSet++;
        }
      }
    }
  }

  // 移除配對
  function removeClusters() {
    // 將磁磚的 type = -1 表示已移除磁磚
    loopClusters(function (index, column, row, cluster) {
      klotski.tiles[column][row].type = -1;
    });

    // 計算該磁磚應該向下移動多少
    for (var i = 0; i < klotski.columns; i++) {
      let shift = 0;
      for (var j = klotski.rows - 1; j >= 0; j--) {
        // 從下往上循環
        if (klotski.tiles[i][j].type == -1) {
          // 如果磁磚被移除 增加移動
          shift++;
          klotski.tiles[i][j].shift = 0;
        } else {
          // 設定移動
          klotski.tiles[i][j].shift = shift;
        }
      }
    }
  }

  // 移動磁磚並補充新磁磚
  function shiftTiles() {
    // 移動磁磚
    for (var i = 0; i < klotski.columns; i++) {
      for (var j = klotski.rows - 1; j >= 0; j--) {
        // 從下往上循環
        if (klotski.tiles[i][j].type == -1) {
          // 補充隨機的新磁磚
          klotski.tiles[i][j].type = getRandomTile();
        } else {
          // 互換磁磚去移動它
          var shift = klotski.tiles[i][j].shift;
          if (shift > 0) {
            swap(i, j, i, j + shift);
          }
        }

        // 剩餘移動
        klotski.tiles[i][j].shift = 0;
      }
    }
  }

  // 獲取鼠標下方的磁磚
  function getMouseTile(pos) {
    // 計算磁磚的 index
    let tx = Math.floor((pos.x - klotski.x) / klotski.tileWidth);
    let ty = Math.floor((pos.y - klotski.y) / klotski.tileHeight);

    // 檢查磁磚是否有效
    if (tx >= 0 && tx < klotski.columns && ty >= 0 && ty < klotski.rows) {
      // 磁磚有效
      return {
        valid: true,
        x: tx,
        y: ty,
      };
    }

    // 磁磚無效
    return {
      valid: false,
      x: 0,
      y: 0,
    };
  }

  // 檢查兩個磁磚是否可以互換
  function canSwap(x1, y1, x2, y2) {
    // 檢查磁磚是否與所選磁磚相鄰
    if (
      // Math.abs() 取絕對值 表示只能互換上下左右相鄰的
      (Math.abs(x1 - x2) == 1 && y1 == y2) ||
      (Math.abs(y1 - y2) == 1 && x1 == x2)
    ) {
      return true;
    }

    return false;
  }

  // 在 klotski 中互換兩塊磁磚
  function swap(x1, y1, x2, y2) {
    let typeSwap = klotski.tiles[x1][y1].type;
    klotski.tiles[x1][y1].type = klotski.tiles[x2][y2].type;
    klotski.tiles[x2][y2].type = typeSwap;
  }

  // 依據玩家滑鼠互換的兩個磁磚
  function mouseSwap(c1, r1, c2, r2) {
    // 暫存當前移動
    currentMove = { column1: c1, row1: r1, column2: c2, row2: r2 };

    // 取消選定
    klotski.selectedTile.selected = false;

    // 開始動畫
    animationState = 2;
    animationTime = 0;
    gameState = gameStates.resolve;
  }

  // 鼠標移動事件
  function onMouseMove(e) {
    // 獲取滑鼠位置
    let pos = getMousePos(canvas, e);

    // 檢查是否在選擇到磁磚的情況下進行拖曳
    if (drag && klotski.selectedTile.selected) {
      // 獲取鼠標下測轉的位置
      mt = getMouseTile(pos);
      if (mt.valid) {
        // 有效磁磚 -〉檢查磁磚是否可以互換
        if (
          canSwap(
            mt.x,
            mt.y,
            klotski.selectedTile.column,
            klotski.selectedTile.row
          )
        ) {
          // 磁磚互換
          mouseSwap(
            mt.x,
            mt.y,
            klotski.selectedTile.column,
            klotski.selectedTile.row
          );
        }
      }
    }
  }

  // 滑鼠點下事件
  function onMouseDown(e) {
    // 獲取鼠標位置
    var pos = getMousePos(canvas, e);

    // 開始拖曳
    if (!drag) {
      // 獲取鼠標下方的磁磚
      mt = getMouseTile(pos);

      if (mt.valid) {
        // 磁磚有效
        let swapped = false;
        if (klotski.selectedTile.selected) {
          if (
            mt.x == klotski.selectedTile.column &&
            mt.y == klotski.selectedTile.row
          ) {
            // 重複選取 返回
            klotski.selectedTile.selected = false;
            drag = true;
            return;
          } else if (
            canSwap(
              mt.x,
              mt.y,
              klotski.selectedTile.column,
              klotski.selectedTile.row
            )
          ) {
            // 可以互換就互換
            mouseSwap(
              mt.x,
              mt.y,
              klotski.selectedTile.column,
              klotski.selectedTile.row
            );
            swapped = true;
          }
        }

        if (!swapped) {
          // 設定選取到的新磁磚
          klotski.selectedTile.column = mt.x;
          klotski.selectedTile.row = mt.y;
          klotski.selectedTile.selected = true;
        }
      } else {
        // 磁磚無效
        klotski.selectedTile.selected = false;
      }

      // 開始拖曳
      drag = true;
    }

    // 檢查按鈕是否已被點擊
    for (var i = 0; i < buttons.length; i++) {
      if (
        pos.x >= buttons[i].x &&
        pos.x < buttons[i].x + buttons[i].width &&
        pos.y >= buttons[i].y &&
        pos.y < buttons[i].y + buttons[i].height
      ) {
        // 按鈕 i 已被點擊
        if (i == 0) {
          // 新開局
          newGame();
        } else if (i == 1) {
          // 顯示提示
          showMoves = !showMoves;
          buttons[i].text = (showMoves ? "隱藏" : "開啟") + "提示";
        }
      }
    }
  }

  // 放開鼠標
  function onMouseUp(e) {
    // 重置拖曳
    drag = false;
  }

  // 鼠標離開
  function onMouseOut(e) {
    // 重置拖曳
    drag = false;
  }

  // 獲取鼠標位置
  function getMousePos(canvas, e) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: Math.round(
        ((e.clientX - rect.left) / (rect.right - rect.left)) * canvas.width
      ),
      y: Math.round(
        ((e.clientY - rect.top) / (rect.bottom - rect.top)) * canvas.height
      ),
    };
  }

  init();
};
