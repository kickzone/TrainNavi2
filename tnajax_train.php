<?php

/* 時間と路線を指定して列車情報を得る。ExportPackageのコピペを加工したもの */
require_once 'funcs.php';
require_once 'ExportPackage.php';

$lineIDList = array();
$trainKindList = array();
$stationIDList = array();

$lines = $_POST['Lines'];
$ret= "";

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
		$lineIDList[$lines[$i]] = $currentLineID;
		$currentLineID++;
	}
}

//列車種類一覧
for($i=0; $i<count($lines); $i++)
{
	$query = "SELECT * FROM tntrainkind WHERE linename='$lines[$i]'";
	$result = ExecQuery($mysqli, $query);
	if($result->num_rows > 0)
	{
		$lineID = $lineIDList[$lines[$i]];
		$currentTrainKind = 1;
		$trainKindListSub = array();
		while($row = $result->fetch_assoc())
		{
			$trainKindListSub[$row['trainkind']] = $currentTrainKind;
			$currentTrainKind++;
		}
		$trainKindList[$lineID] = $trainKindListSub;
	}
}

//駅一覧
for($i=0; $i<count($lines); $i++)
{
	$query = "SELECT * FROM tnstation WHERE linename='$lines[$i]'";
	$result = ExecQuery($mysqli, $query);
	if($result->num_rows > 0)
	{
		$lineID = $lineIDList[$lines[$i]];
		$currentStationID = 1;
		$stationIDListSub = array();
		while($row = $result->fetch_assoc())
		{
			$stationIDListSub[$row['stationname']] = $currentStationID;
			$currentStationID++;
		}
		$stationIDList[$lineID] = $stationIDListSub;
	}
}


//まず、読み込み対象となる列車名一覧を作成する
//路線ごとに保存する
$loadedTrainList = json_decode($_POST['LoadedTrains']);
$toLoadTrainList = array();
for($i=0; $i<count($lines); $i++)
{
	$toLoadTrainListSub = array();
	if($_POST['FromTime'] > $_POST['ToTime'])
	{
		#日をまたぐ場合
		$query = "SELECT distinct trainname FROM tnroute WHERE linename='$lines[$i]' AND (starttime>=\"".$_POST['FromTime']."\" OR starttime<=\"".$_POST['ToTime']."\") AND service=".$_POST['Service'];
	}
	else
	{
		#通常
		$query = "SELECT distinct trainname FROM tnroute WHERE linename='$lines[$i]' AND starttime>=\"".$_POST['FromTime']."\" and starttime<=\"".$_POST['ToTime']."\" AND service=".$_POST['Service'];
	}
	$result = ExecQuery($mysqli, $query);
	if($result->num_rows > 0)
	{
		while($row = $result->fetch_assoc())
		{
			//読み込み済みでない列車番号を追加
			if(!in_array($row['trainname'], $loadedTrainList[$i]))
			{
				$toLoadTrainListSub[] = $row['trainname'];
			}
		}
	}
	$toLoadTrainList[] = $toLoadTrainListSub;
}
//直通先列車を調べて読み込み対象に加える
for($i=0; $i<count($lines); $i++)
{
	$toLoadTrainListSub = $toLoadTrainList[$i];
	if(count($toLoadTrainListSub) == 0) continue;

	$query = MakeTrainsSQL($lines[$i],$toLoadTrainListSub);
	$result = ExecQuery($mysqli, $query);
	while($row = $result->fetch_assoc())
	{
		//直通先がある？
		if($row['nextlinename'] != "")
		{
			$nextline = $row['nextlinename'];
			$nexttrain = $row['nexttrainname'];
			while($nextline != "")
			{
				//読み込み対象の路線？
				if(array_key_exists($nextline, $lineIDList))
				{
					$k = $lineIDList[$nextline]-1;
					$toLoadTrainListSub2 = $toLoadTrainList[$k];
					//すでに読み込み済み、または読み込む予定か？
					if(!in_array($nexttrain, $loadedTrainList[$k]) && !in_array($nexttrain, $toLoadTrainListSub2))
					{
						//追加
						$toLoadTrainListSub2[] = $nexttrain;
						$toLoadTrainList[$k] = $toLoadTrainListSub2;
						//さらに直通先があれば追加
						$query = "SELECT * FROM tntrain WHERE linename='$nextline' AND trainname='$nexttrain' AND service=".$_POST['Service'];
						//echo $query . "\n";
						$result2 = ExecQuery($mysqli, $query);
						if($result2->num_rows > 0)
						{
							$row2 = $result2->fetch_assoc();
							$nextline = $row2['nextlinename'];
							$nexttrain = $row2['nexttrainname'];
						}
					}
					else
					{
						//読み込み済み・読み込み予定なのでスキップ
						break;
					}
				}
				else
				{
					//対象外の路線なのでスキップ
					break;
				}
			}
		}
	}

}
//改めて読み込む
for($i=0; $i<count($lines); $i++)
{
	$toLoadTrainListSub = $toLoadTrainList[$i];
	if(count($toLoadTrainListSub) == 0) continue;

	$lineID = $lineIDList[$lines[$i]];
	$ret .=  "-$lineID,$lines[$i]\n";
	$trainKindListSub = $trainKindList[$lineID];
	$stationIDListSub = $stationIDList[$lineID];

	$query = MakeTrainsSQL($lines[$i], $toLoadTrainListSub);
	$result = ExecQuery($mysqli, $query);
	while($row = $result->fetch_assoc())
	{
		$ret .= MakeTrainText($mysqli, $row, $lineIDList, $trainKindListSub, $stationIDListSub, $_POST['Service']);
		$ret .= "\n";
	}
}
$ret = rtrim($ret);
echo $ret;

function MakeTrainsSQL($linename, $toLoadTrainListSub)
{
	$query = "SELECT * FROM tntrain WHERE linename='$linename' AND service=".$_POST['Service']. " AND (";
	for($j=0; $j<count($toLoadTrainListSub); $j++)
	{
		if($j > 0) $query .= " OR ";
		$query .= "trainname='$toLoadTrainListSub[$j]'";
	}
	$query .= ")";
	return $query;
}

?>