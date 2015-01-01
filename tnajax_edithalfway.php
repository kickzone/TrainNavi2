<?php
/* halfwaysの更新 */
require_once 'funcs.php';

$line = $_POST['Line'];
$kilo = $_POST['Kilo'];
$lat = $_POST['Lat'];
$lon = $_POST['Lon'];

$mysqli = OpenDb();

//全削除＋全追加
$query = "DELETE FROM tnhalfway WHERE linename = '$line'";
$result = ExecQuery($mysqli, $query);

for($i=0; $i<count($kilo); $i++){
	$query = "INSERT INTO tnhalfway (linename, kilo, latitude, longitude) VALUES ('$line', $kilo[$i], $lat[$i], $lon[$i])";
	//echo $query;
	$result = ExecQuery($mysqli, $query);
}

$mysqli->close();

?>