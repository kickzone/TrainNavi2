<?php

require_once 'ImportTimeTable.php';
require_once 'ImportFiles.php';

//初期値
$message = "";
$tbFolder = 'C:\\pleiades\\xampp\\htdocs\\TrainNavi2\\';
$tbURL = 'http://';
$tbTest = '';

if (isset($_POST["dl"])) {
	//10分待ち
	set_time_limit (600);
	$listlist = MakeFileListList($_POST["url"]);
	foreach($listlist as $listUrl)
	{
		echo $listUrl . '<BR>';
		$list = MakeFileList($listUrl);
		DownloadFileList($_POST["folder"], $listUrl, $list);
	}
	//テキストボックスの値をそのままにする
	$tbFolder = $_POST["folder"];
	$tbURL = $_POST["url"];
	$tbTest = $_POST['file'];
}
else if (isset($_POST["make"])) {
	echo '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">';
	ImportTimeTableAll($_POST["folder"], $_POST["lineName"], $_REQUEST["service"]);
	//テキストボックスの値をそのままにする
	$tbFolder = $_POST["folder"];
	$tbURL = $_POST["url"];
	$tbTest = $_POST['file'];
}
else if (isset($_POST["singleFile"])) {
	//テスト用
	ImportTimeTable($_POST['file'], "", "", "",$_REQUEST["service"]);
	//テキストボックスの値をそのままにする
	$tbFolder = $_POST["folder"];
	$tbURL = $_POST["url"];
	$tbTest = $_POST['file'];

}


//路線一覧のHTMLを出力する
function MakeListBox()
{

	$mysqli = OpenDb();
	$query = "SELECT * FROM tnline";
	$result = ExecQuery($mysqli, $query);

	$retStr = "<select name=\"lineName\" size=\"5\">";
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
<title>時刻表インポート</title>
</head>

<body>
<form id="tableForm" name="tableForm" action="" method="POST">
<fieldset>
  <legend>時刻表インポート機能</legend>
  <div><?php echo $message ?></div>
  作業フォルダ：<input type="text" id="folder" name="folder" value="<?php echo $tbFolder; ?>" /><BR>
  <BR>
  <P>列車一覧をダウンロード</P>
  URL:<input type="text" id="url" name="url" value="<?php echo $tbURL; ?>" /><BR>
  <input type="submit" id="dl" name="dl" value="ダウンロード開始"><BR>
  <BR>

  <P>エクスポートする路線</P>
  <div><?php echo MakeListBox() ?></div>

  <P>時刻表csvを作成</P>
  <input type="radio" id="weekday" name="service" value="1" checked>平日ダイヤ
  <input type="radio" id="holiday" name="service" value="2">休日ダイヤ
  <input type="submit" id="make" name="make" value="csv作成開始"><BR>
  <BR>
  <P>テスト用</P>
  ファイル名：<input type="text" id="file" name="file" value="<?php echo $tbTest; ?>" /><BR>
  <input type="submit" id="singleFile" name="singleFile" value="テスト"><BR>
  </fieldset>
  </form>
</body>

</html>