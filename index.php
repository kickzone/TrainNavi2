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
<!-- <input type="text" id="hour" value="5">時<input type="text" id="minute" value="0">分開始<br>
<input type="text" id="speed" value="60">倍速 <input type="text" id="fps" value="15">fps<br> -->
<input type="button" value="Start!" onclick="Start()"/><br />
<div id="wrapper">
<canvas width="1600px" height="900px" >
</canvas>
</div>
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
	TNModel.init(lst);
	TNView.init();
}
</script>
</body>
</html>