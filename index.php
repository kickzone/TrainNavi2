<?php

require_once 'funcs.php';

//路線一覧のHTMLを出力する
function MakeListBox()
{

	$mysqli = OpenDb();
	$query = "SELECT * FROM tnline";
	$result = ExecQuery($mysqli, $query);

	$retStr = "<select name=\"lineName[]\" size=\"5\" multiple>";
	while ($row = $result->fetch_assoc()) {
		$retStr .= "<option ";
		$retStr .= "value=\"" . $row["linename"] . "\">". $row["linename"]."</option>";
	}
	$retStr .= "</select>";

	$mysqli->close();

	return $retStr;
}

?>

<!DOCTYPE HTML>
<html lang="ja">
<head>
<meta charset="UTF-8">
<script src="easeljs-0.7.1.min.js"></script>
<script src="jquery-2.1.1.js"></script>
<title>TrainNavi2</title>
<style type='text/css'>
#wrapper{
    height: auto;
    overflow: auto;
    position: relative;
    z-index: 1;
    width: 100%;
    height:100%;
    min-height:100%;
}

canvas {  }

</style>
</head>
<body>
<div><?php echo MakeListBox() ?></div>
<input type="text" id="hour" value="5">時<input type="text" id="minute" value="0">分開始<input type="text" id="speed" value="60">倍速 <input type="text" id="fps" value="15">fps
<br>
<input type="radio" id="weekday" name="service" value="1" checked>平日ダイヤ
<input type="radio" id="holiday" name="service" value="2">休日ダイヤ
<BR>
<input type="radio" id="destFull" name="dest" value="1" checked>行先表示フル
<input type="radio" id="destAbbr" name="dest" value="2">行先省略表示
<input type="radio" id="destNone" name="dest" value="3">行先表示しない
<BR>
<input type="radio" id="sizeFull" name="size" value="1" checked>画面に合わせる
<input type="radio" id="size1600" name="size" value="2">1600*900
<input type="radio" id="size1024" name="size" value="3">1024*768
<input type="button" value="Start!" onclick="Start()"/><span id="status"></span><br />
<div id="wrapper">
<canvas>
</canvas>
</div>
<P>履歴</P>
<P>2014/11/30 縦横縮尺率の変更、ドラッグによるスクロール・ホイールによる拡大縮小機能追加、画面上にないオブジェクトをcanvasに乗せないことで動作を軽量化、canvasのサイズ選択追加、京王線系統のDB追加</P>
<P>2014/11/25 平日/休日ダイヤの切り替え、行先表示の省略・表示なし機能を追加、休日ダイヤを含めたDB拡充</P>
<P>2014/11/24 行先表示に対応</P>
<P>2014/11/23 初版</P>
<script src="tnfuncs.js"></script>
<script src="tnmodel.js"></script>
<script src="tnview.js"></script>
<script src="tndb.js"></script>
<script src="tnline.js"></script>
<script src="tnstation.js"></script>
<script src="tnhalfway.js"></script>
<script src="tnrailroad.js"></script>
<script src="tntrain.js"></script>
<script src="tntrainkind.js"></script>
<script>
function Start()
{
	var aLineArr = [];
	var lst = $("select[name='lineName[]']").val();
	var startHour = $("#hour").val();
	var startMinute = $("#minute").val();
	var speed = $("#speed").val();
	var fps =  $("#fps").val();
	var startTime = new Date();
	startTime.setHours(parseInt(startHour));
	startTime.setMinutes(parseInt(startMinute));
	startTime.setSeconds(0);
	startTime.setMilliseconds(0);

	//サイズ変更
	var sizeOpt = parseInt($("input[name='size']:checked").val());
	var sizeX, sizeY;
	if(sizeOpt == 1){
		sizeX = $(window).width();
		sizeY = $(window).height()-100;
	}
	else if(sizeOpt == 2){
		sizeX = 1600;
		sizeY = 900;
	}
	else if(sizeOpt == 3){
		sizeX = 1024;
		sizeY = 768;
	}
	var canvas = $("canvas")[0];
	canvas.width = sizeX;
	canvas.height = sizeY;

	var option = {
		startTime : startTime,
		speed : parseInt(speed),
		fps : parseInt(fps),
		service : parseInt($("input[name='service']:checked").val()),
	};
	TNModel.init(lst, option);
	option = {
		dest : parseInt($("input[name='dest']:checked").val()),
	};
	TNView.init(option);
	TNModel.start();
}
</script>
</body>
</html>