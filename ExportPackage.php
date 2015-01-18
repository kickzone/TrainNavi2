<?php
require_once 'funcs.php';

function ExportPackage($fileNameBase, $lines, $options)
{
	$lineIDList = array();
	$trainKindList = array();
	$stationIDList = array();

	$fileName = $fileNameBase . "_static.tn";
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
				fwrite($fp, "$currentStationID,".$row['stationname'].",".$row['kilo'].",".$row['latitude'].",".$row['longitude'].",".$row['address']."\n");
				$stationTmp = $row['stationname'];
				//2014/12/21 大江戸線、山手線対応のため、同一名称の駅に内部的に"2"をつけておく
				//"3"はないよね
				if(array_key_exists($stationTmp, $stationIDListSub)){
					$stationTmp .= "2";
				}
				$stationIDListSub[$stationTmp] = $currentStationID;
				$currentStationID++;
			}
			$stationIDList[$lineID] = $stationIDListSub;
		}
	}
	//通過点一覧
	fwrite($fp, "[halfway]\n");
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
				fwrite($fp, $row['kilo'].",".$row['latitude'].",".$row['longitude']."\n");
			}
		}
	}
	fclose($fp);

	//列車一覧
	for($i=0; $i<count($lines); $i++)
	{
		$fileName = sprintf("%s_train%02d.tn", $fileNameBase, $i+1);
		$fp = fopen($fileName, "w");
		$query = "SELECT * FROM tntrain WHERE linename='$lines[$i]'";
		$result = ExecQuery($mysqli, $query);
		if($result->num_rows > 0)
		{
			$lineID = $lineIDList[$lines[$i]];
			//fwrite($fp, "-$lineID,$lines[$i]\n");
			$trainKindListSub = $trainKindList[$lineID];
			$stationIDListSub = $stationIDList[$lineID];
			while($row = $result->fetch_assoc())
			{
				fwrite($fp, MakeTrainText($mysqli, $row, $lineIDList, $trainKindListSub, $stationIDListSub, $row['service']));
				fwrite($fp, "\n");
			}
		}
		fclose($fp);
	}
}

//列車1台分1行のテキストを得る
//この関数は他でも使いまわします
function MakeTrainText($mysqli, $row, $lineIDList, $trainKindListSub, $stationIDListSub, $service)
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
			case "通勤特別快速":
				$trainkind =  $trainKindListSub["通勤特快"];
				break;
			default:
				//ホリデー快速、ホームライナーにも対応
				if(strpos($row['trainkind'], "ホリデー快速") !== FALSE){
					$trainkind = $trainKindListSub["ホリデー快速"];
				}
				else if(strpos($row['trainkind'], "ホームライナー") !== FALSE){
					$trainkind = $trainKindListSub["ホームライナー"];
				}
				else if(strpos($row['trainkind'], "スカイライナー") !== FALSE){
					$trainkind = $trainKindListSub["スカイライナー"];
				}
				else if(strpos($row['trainkind'], "モーニングライナー") !== FALSE){
					$trainkind = $trainKindListSub["モーニングライナー"];
				}
				else if(strpos($row['trainkind'], "イブニングライナー") !== FALSE){
					$trainkind = $trainKindListSub["イブニングライナー"];
				}
				else if(strpos($row['trainkind'], "シティライナー") !== FALSE){
					$trainkind = $trainKindListSub["シティライナー"];
				}
				else if(strpos($row['trainkind'], "ＴＪライナー") !== FALSE){
					$trainkind = $trainKindListSub["TJライナー"];
				}
				else if(strpos($row['trainkind'], "京急ウィング") !== FALSE){
					$trainkind = $trainKindListSub["京急ウィング号"];
				}
				else if(strpos($row['trainkind'], "特急きぬ") !== FALSE || strpos($row['trainkind'], "特急けごん") !== FALSE || strpos($row['trainkind'], "スカイツリートレイン") !== FALSE ){
					$trainkind = $trainKindListSub["特急スペーシア"];
				}
				else if(strpos($row['trainkind'], "特急しもつけ") !== FALSE || strpos($row['trainkind'], "特急きりふり") !== FALSE || strpos($row['trainkind'], "特急ゆのさと") !== FALSE){
					$trainkind = $trainKindListSub["特急しもつけ"];
				}
				else if(strpos($row['trainkind'], "特急りょうもう") !== FALSE){
					$trainkind = $trainKindListSub["特急りょうもう"];
				}
				else if(strpos($row['trainkind'], "マウントエクスプレス") !== FALSE){
					$trainkind = $trainKindListSub["快速"];
				}
				else{
					//複雑なものは特急だろう
					$trainkind = $trainKindListSub["特急"];
				}
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
	$query2 = "SELECT *, DATE_FORMAT(starttime, '%k:%i') AS start, DATE_FORMAT(endtime, '%k:%i') AS end FROM tnroute WHERE linename='".$row['linename']."' AND trainname='".$row['trainname']."' AND service=$service";
	$result2 = ExecQuery($mysqli, $query2);
	$startStationIDBefore = 0;
	$endStationIDBefore = 0;
	$startBefore = "";
	$endBefore = "";
	$passage = 0;
	while($row2 = $result2->fetch_assoc())
	{
		$startStation = $row2['startstation'];
		$endStation = $row2['endstation'];

		//2014/12/04 ()で駅名が囲んであったら、通過とみなす
		//始点(passage=2)と終点(passage=1)、両方(passage=3)のみ対応
		if(strpos($startStation, "(") === 0){
			$startStation = substr($startStation, 1, strlen($startStation)-2);
			if($passage == 1 || $passage == 3) $passage = 3;
			else $passage = 2;
		} else if(strpos($endStation, "(") === 0){
			$endStation = substr($endStation, 1, strlen($endStation)-2);
			if($passage == 2 || $passage == 3) $passage = 3;
			else $passage = 1;
		}

		//2012/12/21 大江戸線、山手線など同一名称の駅が存在する場合の対処
		//隣接している方を採用
		$startStation2 = $startStation . "2";
		$endStation2 = $endStation . "2";
		if(array_key_exists($startStation, $stationIDListSub) && array_key_exists($startStation2 , $stationIDListSub)){
			if(abs($stationIDListSub[$startStation2] - $stationIDListSub[$endStation])
			 	< abs($stationIDListSub[$startStation] - $stationIDListSub[$endStation])){
				$startStation = $startStation2;
			}
		}

		if(array_key_exists($endStation, $stationIDListSub) && array_key_exists($endStation2 , $stationIDListSub)){
			if(abs($stationIDListSub[$startStation] - $stationIDListSub[$endStation2])
					< abs($stationIDListSub[$startStation] - $stationIDListSub[$endStation])){
				$endStation = $endStation2;
			}
		}

		$startStationID = $stationIDListSub[$startStation];
		$endStationID = $stationIDListSub[$endStation];
		$start = $row2['start'];
		$end = $row2['end'];

		//前回の着駅と今回の発駅が同じなら省略
		//前回の着時間と今回の着時間が同じでも省略
		if($endStationIDBefore == $startStationID) $startStationID = "";
		if($endBefore == $start) $start = "";
		$ret .= ",$startStationID,$start,$endStationID,$end";

		$startStationIDBefore = $stationIDListSub[$startStation];
		$endStationIDBefore = $stationIDListSub[$endStation];
		$startBefore = $row2['start'];
		$endBefore = $row2['end'];
	}
	$ret .= ",";
	if($passage > 0) $ret .= $passage;

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