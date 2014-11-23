<?php
require_once 'funcs.php';

function ExportPackage($fileName, $lines, $options)
{
	$lineIDList = array();
	$trainKindList = array();
	$stationIDList = array();

	$fp = fopen($fileName, "w");
	fwrite($fp, "[line]\n");

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
			fwrite($fp, "$currentLineID,$lines[$i],".$row['linecolor']."\n");
			$lineIDList[$lines[$i]] = $currentLineID;
			$currentLineID++;
		}
	}
	//列車種類一覧
	fwrite($fp, "[trainkind]\n");
	for($i=0; $i<count($lines); $i++)
	{
		$query = "SELECT * FROM tntrainkind WHERE linename='$lines[$i]'";
		$result = ExecQuery($mysqli, $query);
		if($result->num_rows > 0)
		{
			$lineID = $lineIDList[$lines[$i]];
			fwrite($fp, "-$lineID,$lines[$i]\n");
			$currentTrainKind = 1;
			$trainKindListSub = array();
			while($row = $result->fetch_assoc())
			{
				fwrite($fp, "$currentTrainKind,".$row['trainkind'].",".$row['color']."\n");
				$trainKindListSub[$row['trainkind']] = $currentTrainKind;
				$currentTrainKind++;
			}
			$trainKindList[$lineID] = $trainKindListSub;
		}
	}
	//駅一覧
	fwrite($fp, "[station]\n");
	for($i=0; $i<count($lines); $i++)
	{
		$query = "SELECT * FROM tnstation WHERE linename='$lines[$i]'";
		$result = ExecQuery($mysqli, $query);
		if($result->num_rows > 0)
		{
			$lineID = $lineIDList[$lines[$i]];
			fwrite($fp, "-$lineID,$lines[$i]\n");
			$currentStationID = 1;
			$stationIDListSub = array();
			while($row = $result->fetch_assoc())
			{
				fwrite($fp, "$currentStationID,".$row['stationname'].",".$row['kilo'].",".$row['latitude'].",".$row['longitude']."\n");
				$stationIDListSub[$row['stationname']] = $currentStationID;
				$currentStationID++;
			}
			$stationIDList[$lineID] = $stationIDListSub;
		}
	}
	//通過点一覧
	fwrite($fp, "[halfway]\r\n");
	for($i=0; $i<count($lines); $i++)
	{
		$query = "SELECT * FROM tnhalfway WHERE linename='$lines[$i]'";
		$result = ExecQuery($mysqli, $query);
		if($result->num_rows > 0)
		{
			$lineID = $lineIDList[$lines[$i]];
			fwrite($fp, "-$lineID,$lines[$i]\n");
			while($row = $result->fetch_assoc())
			{
				fwrite($fp, $row['kilo'].",".$row['latitude'].",".$row['longitude'].",".$row['sp1lat1'].",".$row['sp1lon1'].",".$row['sp1lat2'].",".$row['sp1lon2'].",".$row['sp2lat1'].",".$row['sp2lon1'].",".$row['sp2lat2'].",".$row['sp2lon2']."\n");
			}
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
			fwrite($fp, "-$lineID,$lines[$i]\n");
			$trainKindListSub = $trainKindList[$lineID];
			$stationIDListSub = $stationIDList[$lineID];
			while($row = $result->fetch_assoc())
			{
				fwrite($fp, MakeTrainText($mysqli, $row, $lineIDList, $trainKindListSub, $stationIDListSub));
				fwrite($fp, "\n");
			}
		}
	}
	fclose($fp);
}

//列車1台分1行のテキストを得る
//この関数は他でも使いまわします
function MakeTrainText($mysqli, $row, $lineIDList, $trainKindListSub, $stationIDListSub)
{
	$trainkindname = "";
	if(array_key_exists($row['trainkind'], $trainKindListSub))
	{
		$trainkind = $trainKindListSub[$row['trainkind']];
		$trainkindname = "";
	}
	else
	{
		//列車種類の例外
		switch($row['trainkind'])
		{
			case "私鉄無料急行":
				$trainkind =  $trainKindListSub["急行"];
				break;
			default:
				//複雑なものは特急だろう
				$trainkind = $trainKindListSub["特急"];
				$trainkindname = $row['trainkind'];
				break;
		}
	}
	$nextline = "";
	$nexttrain = "";
	$terminal = "";
	if($row['nextlinename'] != "")
	{
		if(array_key_exists($row['nextlinename'], $lineIDList))
		{
			$nextline = $lineIDList[$row['nextlinename']];
			$nexttrain = $row['nexttrainname'];
		}
		else
		{
			$terminal = FindTerminal($mysqli, $row['nextlinename'], $row['nexttrainname']);
		}
	}
	$ret = $row['trainname'].",".$row['service'].",$trainkind,$trainkindname,$nextline,$nexttrain,$terminal";
	//列車名を使ってサブクエリを作成
	$query2 = "SELECT *, DATE_FORMAT(starttime, '%k:%i') AS start, DATE_FORMAT(endtime, '%k:%i') AS end FROM tnroute WHERE linename='".$row['linename']."' AND trainname='".$row['trainname']."'";
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
		$ret .= ",$startStationID,$start,$endStationID,$end";

		$startStationIDBefore = $stationIDListSub[$row2['startstation']];
		$endStationIDBefore = $stationIDListSub[$row2['endstation']];
		$startBefore = $row2['start'];
		$endBefore = $row2['end'];
	}

	return $ret;
}

//2014/11/19 乗り入れ先の路線がない場合、画面表示するために終着駅の文字列を得る。
function FindTerminal($mysqli, $nextlinename, $nexttrainname)
{
	$ret = "";
	$query = "SELECT * FROM tntrain WHERE linename='$nextlinename' AND trainname='$nexttrainname'";
	$result = ExecQuery($mysqli, $query);
	while($result->num_rows > 0)
	{
		$row = $result->fetch_assoc();
		if($row['nextlinename'] == "")
		{
			//終点
			//この列車の終着駅名をゲット
			$query = "SELECT * FROM tnroute WHERE linename='$nextlinename' AND trainname='$nexttrainname'";
			$result = ExecQuery($mysqli, $query);
			if($result->num_rows > 0)
			{
				$result->data_seek($result->num_rows-1);
				$row = $result->fetch_assoc();
				$ret = $row['endstation'];
			}
			break;
		}
		else
		{
			//まだ先がある
			$nextlinename = $row['nextlinename'];
			$nexttrainname = $row['nexttrainname'];
			$query = "SELECT * FROM tntrain WHERE linename='$nextlinename' AND trainname='$nexttrainname'";
			$result = ExecQuery($mysqli, $query);
		}
	}
	return $ret;
}

?>