<?php
/* stationの更新 */
require_once 'funcs.php';

$line = $_POST['Line'];
$station = $_POST['Station'];
$lat = $_POST['Lat'];
$lon = $_POST['Lon'];

$mysqli = OpenDb();
$query = "UPDATE tnstation SET latitude=$lat, longitude=$lon WHERE linename='$line' AND stationname='$station'";
$result = ExecQuery($mysqli, $query);

$mysqli->close();

?>