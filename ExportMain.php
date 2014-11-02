<?php

require_once 'Funcs.php';
require_once 'ExportPackage.php';

//初期値
$message = "";
$tbFileName = 'C:\\pleiades\\xampp\\htdocs\\TrainNavi2\\package.tn';
$tbTest = '';

if (isset($_POST["exec"])) {
	//10分待ち
	set_time_limit (600);

	ExportPackage($_POST['fileName'], $_POST['lineName'], null);

	$message = "生成が終了しました。";
	//テキストボックスの値をそのままにする
	$tbFileName = $_POST["fileName"];
}

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
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Frameset//EN">
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<title>時刻表エクスポート</title>
</head>

<body>
<form id="tableForm" name="tableForm" action="" method="POST">
<fieldset>
  <legend>時刻表エクスポート機能</legend>
  <div><?php echo $message ?></div>
  エクスポートするファイル名：<input type="text" id="fileName" name="fileName" value="<?php echo $tbFileName; ?>" /><BR>
  <BR>
  <P>エクスポートする路線一覧</P>
  <div><?php echo MakeListBox() ?></div>
  <input type="submit" id="exec" name="exec" value="生成"><BR>
</fieldset>
</form>
</body>

</html>