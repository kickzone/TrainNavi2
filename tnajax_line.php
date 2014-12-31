<?php
//路線一覧を\n区切りで返す
require_once 'funcs.php';
$mysqli = OpenDb();
$query = "SELECT * FROM tnline";
$result = ExecQuery($mysqli, $query);

$retStr = "";
$first = 1;

while ($row = $result->fetch_assoc()) {
	if($first == 0) echo ",";
	echo $row["linename"];
	$first = 0;
}

$mysqli->close();
?>