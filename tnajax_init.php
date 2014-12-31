<?php
/* 路線、列車種類、駅、通過点一覧を返す。ほぼExportPackageのコピペ */
require_once 'funcs.php';

$lineIDList = array();
$trainKindList = array();
$stationIDList = array();

$lines = $_POST['Lines'];
$ret = "[line]\n";


$mysqli = OpenDb();
$currentLineID = 1;
//路線名一覧
for($i=0; $i<count($lines); $i++)
{
	$query = "SELECT * FROM tnline WHERE linename = '$lines[$i]'";
	$result = ExecQuery($mysqli, $query);
	if($result->num_rows > 0)
	{
		$row = $result->fetch_assoc();
		$ret .= "$currentLineID,$lines[$i],".$row['linecolor']."\n";
		$lineIDList[$lines[$i]] = $currentLineID;
		$currentLineID++;
	}
}

//列車種類一覧
$ret .= "[trainkind]\n";
for($i=0; $i<count($lines); $i++)
{
	$query = "SELECT * FROM tntrainkind WHERE linename='$lines[$i]'";
	$result = ExecQuery($mysqli, $query);
	if($result->num_rows > 0)
	{
		$lineID = $lineIDList[$lines[$i]];
		$ret .= "-$lineID,$lines[$i]\n";
		$currentTrainKind = 1;
		$trainKindListSub = array();
		while($row = $result->fetch_assoc())
		{
			$ret .= "$currentTrainKind,".$row['trainkind'].",".$row['color']."\n";
			$trainKindListSub[$row['trainkind']] = $currentTrainKind;
			$currentTrainKind++;
		}
		$trainKindList[$lineID] = $trainKindListSub;
	}
}

//駅一覧
$ret .= "[station]\n";
for($i=0; $i<count($lines); $i++)
{
	$query = "SELECT * FROM tnstation WHERE linename='$lines[$i]'";
	$result = ExecQuery($mysqli, $query);
	if($result->num_rows > 0)
	{
		$lineID = $lineIDList[$lines[$i]];
		$ret .=  "-$lineID,$lines[$i]\n";
		$currentStationID = 1;
		$stationIDListSub = array();
		while($row = $result->fetch_assoc())
		{
			$ret .= "$currentStationID,".$row['stationname'].",".$row['kilo'].",".$row['latitude'].",".$row['longitude'].",".$row['address']."\n";
			$stationIDListSub[$row['stationname']] = $currentStationID;
			$currentStationID++;
		}
		$stationIDList[$lineID] = $stationIDListSub;
	}
}

//通過点一覧
$ret .=  "[halfway]\n";
for($i=0; $i<count($lines); $i++)
{
	$query = "SELECT * FROM tnhalfway WHERE linename='$lines[$i]'";
	$result = ExecQuery($mysqli, $query);
	if($result->num_rows > 0)
	{
		$lineID = $lineIDList[$lines[$i]];
		$ret .= "-$lineID,$lines[$i]\n";
		while($row = $result->fetch_assoc())
		{
			$ret .= $row['kilo'].",".$row['latitude'].",".$row['longitude'].",".$row['sp1lat1'].",".$row['sp1lon1'].",".$row['sp1lat2'].",".$row['sp1lon2'].",".$row['sp2lat1'].",".$row['sp2lon1'].",".$row['sp2lat2'].",".$row['sp2lon2']."\n";
		}
	}
}
$ret = rtrim($ret);
echo $ret;

?>