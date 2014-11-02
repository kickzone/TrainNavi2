<?php
require_once 'funcs.php';

function ExportPackage($fileName, $lines, $options)
{
	$lineIDList = array();
	$trainKindList = array();
	$stationIDList = array();

	$fp = fopen($fileName, "w");
	fwrite($fp, "[line]\r\n");

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
			fwrite($fp, "$currentLineID,$lines[$i],".$row['linecolor']."\r\n");
			$lineIDList[$lines[$i]] = $currentLineID;
			$currentLineID++;
		}
	}
	//列車種類一覧
	fwrite($fp, "[trainkind]\r\n");
	for($i=0; $i<count($lines); $i++)
	{
		$query = "SELECT * FROM tntrainkind WHERE linename='$lines[$i]'";
		$result = ExecQuery($mysqli, $query);
		if($result->num_rows > 0)
		{
			$lineID = $lineIDList[$lines[$i]];
			fwrite($fp, "-$lineID,$lines[$i]\r\n");
			$currentTrainKind = 1;
			$trainKindListSub = array();
			while($row = $result->fetch_assoc())
			{
				fwrite($fp, "$currentTrainKind,".$row['trainkind'].",".$row['color']."\r\n");
				$trainKindListSub[$row['trainkind']] = $currentTrainKind;
				$currentTrainKind++;
			}
			$trainKindList[$lineID] = $trainKindListSub;
		}
	}
	//駅一覧
	fwrite($fp, "[station]\r\n");
	for($i=0; $i<count($lines); $i++)
	{
		$query = "SELECT * FROM tnstation WHERE linename='$lines[$i]'";
		$result = ExecQuery($mysqli, $query);
		if($result->num_rows > 0)
		{
			$lineID = $lineIDList[$lines[$i]];
			fwrite($fp, "-$lineID,$lines[$i]\r\n");
			$currentStationID = 1;
			$stationIDListSub = array();
			while($row = $result->fetch_assoc())
			{
				fwrite($fp, "$currentStationID,".$row['stationname'].",".$row['kilo'].",".$row['latitude'].",".$row['longitude']."\r\n");
				$stationIDListSub[$row['stationname']] = $currentStationID;
				$currentStationID++;
			}
			$stationIDList[$lineID] = $stationIDListSub;
		}
	}
	//列車一覧
	fwrite($fp, "[train]\r\n");
	for($i=0; $i<count($lines); $i++)
	{
		$query = "SELECT * FROM tntrain WHERE linename='$lines[$i]'";
		$result = ExecQuery($mysqli, $query);
		if($result->num_rows > 0)
		{
			$lineID = $lineIDList[$lines[$i]];
			fwrite($fp, "-$lineID,$lines[$i]\r\n");
			$trainKindListSub = $trainKindList[$lineID];
			$stationIDListSub = $stationIDList[$lineID];
			while($row = $result->fetch_assoc())
			{
				if(array_key_exists($row['trainkind'], $trainKindListSub))
				{
					$trainkind = $trainKindListSub[$row['trainkind']];
					$trainkindname = "";
				}
				else
				{
					//列車種類の例外
					//いまのところ特急くらいしかない、将来的に追加する
					$trainkind = $trainKindListSub["特急"];
					$trainkindname = $row['trainkind'];
				}
				$nextline = "";
				$nexttrain = "";
				if($row['nextlinename'] != "" && array_key_exists($row['nextlinename'], $lineIDList))
				{
					$nextline = $lineIDList[$row['nextlinename']];
					$nexttrain = $row['nexttrainname'];
				}
				fwrite($fp, $row['trainname'].",".$row['service'].",$trainkind,$trainkindname,$nextline,$nexttrain");
				//列車名を使ってサブクエリを作成
				$query2 = "SELECT *, DATE_FORMAT(starttime, '%k:%i') AS start, DATE_FORMAT(endtime, '%k:%i') AS end FROM tnroute WHERE linename='$lines[$i]' AND trainname='".$row['trainname']."'";
				$result2 = ExecQuery($mysqli, $query2);
				$startStationIDBefore = 0;
				$endStationIDBefore = 0;
				$startBefore = "";
				$endBefore = "";
				while($row2 = $result2->fetch_assoc())
				{
					$startStationID = $stationIDListSub[$row2['startstation']];
					$endStationID = $stationIDListSub[$row2['endstation']];
					$start = $row2['start'];
					$end = $row2['end'];

					//前回の着駅と今回の発駅が同じなら省略
					//前回の着時間と今回の着時間が同じでも省略
					if($endStationIDBefore == $startStationID) $startStationID = "";
					if($endBefore == $start) $start = "";
					fwrite($fp, ",$startStationID,$start,$endStationID,$end" );

					$startStationIDBefore = $stationIDListSub[$row2['startstation']];
					$endStationIDBefore = $stationIDListSub[$row2['endstation']];
					$startBefore = $row2['start'];
					$endBefore = $row2['end'];
				}
				fwrite($fp, "\r\n");
			}
		}
	}
	fclose($fp);
}

?>