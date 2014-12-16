<?php
require 'funcs.php';
require_once 'simple_html_dom.php';

function ImportTimeTableAll($folder, $lineName ,$service)
{
	//30分間待ってやる
	set_time_limit (1800);

	$iterator = new RecursiveDirectoryIterator($folder);
	$iterator = new RecursiveIteratorIterator($iterator);

	$csvTrain = pathCombine($folder, "tntrain.csv");
	$csvRoute = pathCombine($folder, "tnroute.csv");
	if(file_exists($csvTrain)) unlink($csvTrain);
	if(file_exists($csvRoute)) unlink($csvRoute);

	foreach ($iterator as $fileinfo) { // $fileinfoはSplFiIeInfoオブジェクト
		if ($fileinfo->isFile() && $fileinfo->getExtension() == "htm") {
			ImportTimeTable($fileinfo->getRealPath(), $csvTrain, $csvRoute, $lineName, $service);
		}
	}
}

function ImportTimeTable($fileName, $csvTrain, $csvRoute, $lineName, $service)
{
	$dom = file_get_html($fileName);

	foreach($dom->find('td[class=lowBg06]') as $tdbg06)
	{
		if(strstr($tdbg06->plaintext, '列車名'))
		{
			$trainkinds = $tdbg06->nextSibling()->plaintext;
			$aTrainKinds = SplitItem($trainkinds);
			print_r($aTrainKinds);
			echo '<BR>';
		}
		if(strstr($tdbg06->plaintext, '列車番号'))
		{
			$trainnames = $tdbg06->nextSibling()->plaintext;
			$aTrainNames = SplitItem($trainnames);
			print_r($aTrainNames);
			echo '<BR>';
		}
		if(strstr($tdbg06->plaintext, '運転日'))
		{
			$serviceTmp = $tdbg06->nextSibling()->plaintext;
			$aService = SplitItem($serviceTmp);
			print_r($aService);
			echo '<BR>';
		}
	}

	$mysqli = OpenDb();

	$beforeStation = null;
	$beforeStationName = null;

	$trains = array();

	$currentTrain = new Train();
	$trains[] = $currentTrain;
	$trainRangeKind = null;
	$trainRangeName = null;

	//土曜休日運転 or 平日運転
	//2014/12/02 UIで決定するように変更 '毎日運転'なんてのがあるから
	//if(strstr($aService[0], '休日運転'))
	//{
	//	$service = 2;
	//}
	//else
	//{
	//	$service = 1;
	//}
	$currentTrain->service = $service;

	//列車種類、列車番号
	if(count($aTrainNames) == 1)
	{
		//乗り入れがない場合
		$currentTrain->trainName = $aTrainNames[0];
	}
	else
	{
		//乗り入れがある・列車種類が途中で変わる場合、$aTrainNamesは Array ( [0] => [唐木田〜代々木上原]： [1] => 多摩急行 [2] => [代々木上原〜我孫子]： [3] => 普通 ) のようになっている
		$trainRangeName = TrainRange($aTrainNames[0]);
		$currentTrain->trainName = $aTrainNames[1];
	}
	if(count($aTrainKinds) == 1)
	{
		//乗り入れがない場合
		$currentTrain->trainKind = $aTrainKinds[0];

	}
	else
	{
		$trainRangeKind = TrainRange($aTrainKinds[0]);
		$currentTrain->trainKind = $aTrainKinds[1];
	}

	$kindCount = 0;
	$nameCount = 0;

	$beforeStationName = "";


	//まず初めの路線名を決定する
	foreach($dom->find('a[href*=station]') as $stationLink)
	{
		$dom->find('a[href*=station]');

		$stationFirstNode = $stationLink->parentNode()->parentNode()->parentNode()->parentNode();
		$stationFirstArr = SplitItem($stationFirstNode->plaintext);
		$stationName = ModifyStationName($stationFirstArr[0], $currentTrain->lineName);
		$currentLine = SelectLine($stationName, $dom, $mysqli, $currentTrain->trainKind);
		$currentStationName = $stationName;

		$kindChanged = false;
		$nameChanged = false;

		ModifyTrainKind($currentTrain->trainKind, $currentLine);
		if($trainRangeKind != null)
		{
			$trainRangeKind[0] = ModifyStationName($trainRangeKind[0], $currentLine);
			$trainRangeKind[1] = ModifyStationName($trainRangeKind[1], $currentLine);
			if($currentStationName == $trainRangeKind[1]) $kindChanged = true;
		}
		if($trainRangeName != null)
		{
			$trainRangeName[0] = ModifyStationName($trainRangeName[0], $currentLine);
			$trainRangeName[1] = ModifyStationName($trainRangeName[1], $currentLine);
			if($currentStationName == $trainRangeName[1]) $nameChanged = true;
		}
		if($kindChanged)
		{
			$kindCount++;
			echo "列車種類が変わった : " . $aTrainKinds[$kindCount*2+1] . "<BR>";
			$currentTrain->trainKind = $aTrainKinds[$kindCount*2+1];
			$trainRangeKind = TrainRange($aTrainKinds[$kindCount*2]);
		}
		if($nameChanged)
		{
			$nameCount++;
			echo "列車番号が変わった : " . $aTrainNames[$nameCount*2+1] . "<BR>";
			$currentTrain->trainName = $aTrainNames[$nameCount*2+1];
			$trainRangeName = TrainRange($aTrainNames[$nameCount*2]);
		}
		//2014/12/02 DBに存在しない駅はスキップ
		if($currentLine == "") continue;

		echo $currentLine, ' からはじまる<BR>';
		$currentTrain->lineName = $currentLine;

		break;
	}

	//東急大井町線など、種類名を変更する場合
	$currentTrain->trainKind = SpecialKindChange($currentTrain->lineName, $currentTrain->trainKind, $dom);

	//経路情報をゲットしていく
	$route = new Route();
	$trainNameTable = array();
	$trainNameTable[$currentTrain->lineName] = $currentTrain->trainName;
	foreach($dom->find('a[href*=station]') as $stationLink)
	{
		$station = $stationLink->parentNode()->parentNode()->parentNode()->parentNode();
		$currentStation = SplitItem($station->plaintext);
		$stationName = $currentStation[0];
		$stationName = ModifyStationName($stationName, $currentTrain->lineName);

		//2014/12/02 DBに存在しない駅はスキップ
		if($beforeStation != null)
		{
			//路線が変わったかどうか判定

			//あさぎり特殊対処 駅名と路線名の不一致を訂正
			ModifyAsagiri($stationName, $currentLine);

			$query = "SELECT stationname FROM tnstation WHERE linename='$currentTrain->lineName' AND stationname='$stationName'";
			$result = ExecQuery($mysqli, $query);
			$bLineChanged = false;
			$kindChanged = false;
			$nameChanged = false;
			if($trainRangeKind != null)
			{
				$trainRangeKind[0] = ModifyStationName($trainRangeKind[0], $currentLine);
				$trainRangeKind[1] = ModifyStationName($trainRangeKind[1], $currentLine);
				if($beforeStationName == $trainRangeKind[1]){
					//TJライナー→(料金不要)ＴＪライナーの場合の特別対処
					if(strpos($aTrainKinds[$kindCount*2+1], "ＴＪライナー") !== FALSE){

					}else{
						$kindChanged = true;
					}
				}
			}
			if($trainRangeName != null)
			{
				$trainRangeName[0] = ModifyStationName($trainRangeName[0], $currentLine);
				$trainRangeName[1] = ModifyStationName($trainRangeName[1], $currentLine);
				if($beforeStationName == $trainRangeName[1]) $nameChanged = true;
			}
			$special = SpecialChange($beforeStationName, $currentTrain->lineName, $currentTrain->trainKind, $dom);
			if($result->num_rows==0 || $special != "")
			{
				//路線が変わった
				//Trainを新規作成
				if($special){
					echo "路線が変わった(特別対処)";
				} else{
					echo "路線が変わった : ".$currentTrain->lineName." に " . $stationName . "がなかった<BR>";
				}
				$newTrain = new Train();
				$trains[] = $newTrain;
				if($special){
					$currentLine = $special;
				}else{
					$currentLine = SelectLine($stationName, $dom, $mysqli, null);
				}
				if($currentLine == ""){
					//2014/12/03 未登録なのでスキップ
					$beforeStation = $currentStation;
					$beforeStationName = $stationName;
					echo "路線未登録のためスキップ<BR>";
					continue;
				}else{
					echo $currentLine . " に変更<BR>	";
				}

				//あさぎり特殊対処 駅名と路線名の不一致を訂正
				ModifyAsagiri($route->startStation, $currentLine);
				if($beforeStationName == "新松田" && $trainRangeName != null && $trainRangeName[1] =="松田" ) $nameChanged = true;

				$newTrain->lineName = $currentLine;
				if($kindChanged)
				{
					//列車種類も同時に変わる場合
					$kindCount++;
					echo "列車種類が変わった : " . $aTrainKinds[$kindCount*2+1] . "<BR>";
					$newTrain->trainKind = $aTrainKinds[$kindCount*2+1];
					$trainRangeKind = TrainRange($aTrainKinds[$kindCount*2]);
				}
				else
				{
					//前のTrainの情報をコピー
					$newTrain->trainKind = $currentTrain->trainKind;
				}

				//東急大井町線など、種類名を変更する場合
				$newTrain->trainKind = SpecialKindChange($newTrain->lineName, $newTrain->trainKind, $dom);

				if($nameChanged)
				{
					//列車番号も同時に変わる場合
					$nameCount++;
					//2014/12/02 中央快速線→緩行線→快速線など、同一路線に戻ってくる場合に列車番号を変えないと一意性がなくなる
					if(array_key_exists($currentLine, $trainNameTable))
					{
						if($trainNameTable[$currentLine] == $aTrainNames[$nameCount*2+1])
						{
							$aTrainNames[$nameCount*2+1] .= "A";
							echo "列車番号重複のため変更 : " ;
						}
					}
					echo "列車番号が変わった : " . $aTrainNames[$nameCount*2+1] . "<BR>";
					$newTrain->trainName = $aTrainNames[$nameCount*2+1];
					$trainRangeName = TrainRange($aTrainNames[$nameCount*2]);
				}
				else
				{
					$newTrain->trainName = $currentTrain->trainName;
					//2014/12/02 中央快速線→緩行線→快速線など、同一路線に戻ってくる場合に列車番号を変えないと一意性がなくなる
					if(array_key_exists($currentLine, $trainNameTable))
					{
						if($trainNameTable[$currentLine] == $currentTrain->trainName)
						{
							$newTrain->trainName .= "A";
							echo "列車番号重複のため変更 : " . $newTrain->trainName . "<BR>";
						}
					}
				}
				ModifyTrainKind($newTrain->trainKind, $currentLine);
				$newTrain->service = $currentTrain->service;
				//次の列車の参照を代入しておく
				$currentTrain->nextTrain = $newTrain;
				//路線の変わった駅が通過駅だった場合(メトロはこね・あさぎりなど)
				//暫定的な発着時刻を代入する
				if(count($currentTrain->routes) == 0 || end($currentTrain->routes)->endStation != $beforeStationName)
				{
					$passageTime = CalcPassageTime($mysqli, $currentTrain->lineName, $route->startStation, $route->startTime, $beforeStationName, $newTrain, $dom);
					echo "路線の変わった駅が通過駅だった : $beforeStationName - 通過予想時刻 $passageTime<BR>";
					$route->endStation = "(" . $beforeStationName . ")";
					$route->endTime = $passageTime;
					$currentTrain->routes[] = $route;
					$route = new Route();
					$route->startStation = "(" . $beforeStationName . ")";
					$route->startTime = $passageTime;
				}

				//置き換える
				$currentTrain = $newTrain;
				$bLineChanged = true;
				$trainNameTable[$currentTrain->lineName] = $currentTrain->trainName;
			}
			//化け急など、同一路線内で列車種類が途中で変わっているかどうかチェック
			if(($kindChanged || $nameChanged) && count($currentTrain->routes) > 0 && !$bLineChanged)
			{
				$newTrain = new Train();
				$trains[] = $newTrain;
				//同一路線
				$newTrain->lineName = $currentTrain->lineName;
				if($kindChanged)
				{
					//列車種類が変わる場合
					$kindCount++;
					echo "列車種類が変わった : " . $aTrainKinds[$kindCount*2+1] . "<BR>";
					$newTrain->trainKind = $aTrainKinds[$kindCount*2+1];
					$trainRangeKind = TrainRange($aTrainKinds[$kindCount*2]);
				}
				else
				{
					//前のTrainの情報をコピー
					$newTrain->trainKind = $currentTrain->trainKind;
				}
				if($nameChanged)
				{
					//列車番号が変わる場合
					$nameCount++;
					echo "列車番号が変わった : " . $aTrainNames[$nameCount*2+1] . "<BR>";
					$newTrain->trainName = $aTrainNames[$nameCount*2+1];
					$trainRangeName = TrainRange($aTrainNames[$nameCount*2]);
				}
				else
				{
					$newTrain->trainName = $currentTrain->trainName;
				}
				ModifyTrainKind($newTrain->trainKind, $newTrain->lineName);
				$newTrain->service = $currentTrain->service;
				//次の列車の参照を代入しておく
				$currentTrain->nextTrain = $newTrain;
				//置き換える
				$currentTrain = $newTrain;
			}
		}

		$beforeStation = $currentStation;
		$beforeStationName = $stationName;

		if($currentStation[1] == 'レ' || (count($currentStation) > 2 && $currentStation[2] == 'レ'))
		{
			//通過
			//ToDo:基本的に何もしないが、メトロはこね・あさぎりなど、路線が変わる場合がありえる
			continue;
		}

		$endTime = SearchTime($currentStation, '着');
		if($endTime != null)
		{
			//着時間を代入
			$route->endStation = $stationName;
			$route->endTime = $endTime;
			//着時間の補正
			CheckFalseEndTime($route, $currentLine);
			if($route->startTime) $currentTrain->routes[] = $route;
			$route = new Route();
		}

		$startTime = SearchTime($currentStation, '発');
		if($startTime != null)
		{
			//発時間を代入
			$route->startStation = $stationName;
			$route->startTime = $startTime;
		}
		print_r($currentStation);
		echo '<BR>';
	}

	//2014/11/25 $lineName指定がある場合、指定された路線のデータだけ保存
	if($lineName){
		$tmpTrains = array();
		foreach($trains as $train)
		{
			if($train->lineName == $lineName){
				$tmpTrains[] = $train;
			}
		}
		$trains = $tmpTrains;
	}

	foreach($trains as $train)
	{
		print($train->ToTrainCsv()."<BR>");
	}
	if($csvTrain != "")
	{
		$fp = fopen($csvTrain, "a");
		foreach($trains as $train)
		{
			fwrite($fp, $train->ToTrainCsv()."\r\n");
		}
		fclose($fp);

	}
	foreach($trains as $train)
	{
		print(nl2br($train->ToRoutesCsv(), ENT_QUOTES));
	}

	if($csvRoute != "")
	{
		$fp = fopen($csvRoute, "a");
		foreach($trains as $train)
		{
			fwrite($fp, $train->ToRoutesCsv());
		}
		fclose($fp);

	}

}
//空白文字や、&nbspなどを除去し、配列を作成する
function SplitItem($plaintext)
{
	$retarr = preg_split('/\s/', $plaintext, -1, PREG_SPLIT_NO_EMPTY);
	for($i=0; $i<count($retarr); $i++)
	{
		if($retarr[$i] == '&nbsp;')
		{
			array_splice($retarr, $i, 1);
			$i--;
		}
	}
	return $retarr;
}

function TrainRange($trainStr)
{
	$retarr = array();
	$pos = strpos($trainStr, '〜');
	$retarr[] = substr($trainStr, 1, $pos-1);
	$tmpstr = substr($trainStr, $pos+3);
	$pos = strpos($tmpstr, ']');
	$retarr[] = substr($tmpstr, 0, $pos);
	return $retarr;
}

//DBを読んで路線名を確定する
function SelectLine($stationName, $dom, $mysqli, $trainKind)
{
	$lineName = "";
	$start = false;
	$possibleLines = array();
	foreach($dom->find('a[href*=station]') as $stationLink)
	{
		$station = $stationLink->parentNode()->parentNode()->parentNode()->parentNode();
		$currentStation = preg_split('/\s/', $station->plaintext, -1, PREG_SPLIT_NO_EMPTY);
		$currentStation[0] = ModifyStationName($currentStation[0], "");
		if($stationName == $currentStation[0]) $start = true;
		if($start)
		{
			$currentStationName = $currentStation[0];
			$query = "SELECT linename FROM tnstation WHERE stationname like '%$currentStationName'";
			$result = ExecQuery($mysqli, $query);
			if($result->num_rows==1)
			{
				//特別対処
				if($currentStationName == "落合" && array_search("中央・総武緩行線", $possibleLines) && !array_search("東京メトロ東西線", $possibleLines)){
					return "中央・総武緩行線";
				}
				//ある路線にしかstationNameがなければ確定
				$row = $result->fetch_assoc();
				$lineName = $row['linename'];
				break;
			}
			else
			{

				if(count($possibleLines) == 0)
				{
					//初回
					//とりうる路線名をすべて保存
					$row = $result->fetch_assoc();
					$possibleLines[] = $row['linename'];
					while($row = $result->fetch_assoc())
					{
						$possibleLines[] = $row['linename'];
					}
				}
				else
				{
					//特別対処
					if($currentStationName == "阿佐ケ谷" && $trainKind == "普通"){
						return "中央・総武緩行線";
					}
					//2回目以降
					//$possibleLinesの路線が含まれていなければ削除
					//1つだけ残ったところでそれを確定する
					$thisLines = array();
					$thisLines[$row['linename']] = 1;
					while($row = $result->fetch_assoc())
					{
						$thisLines[$row['linename']] = 1;
					}
					foreach($possibleLines as $key => $value)
					{
						if(!array_key_exists($value, $thisLines))
						{
							unset($possibleLines[$key]);
						}
						if(count($possibleLines) == 1)
						{
							$lineName = reset($possibleLines);
							break;
						}
					}
					if(count($possibleLines) == 1) break;
				}
			}
		}
	}
	//有楽町線、和光市→池袋行特別対処
	if(count($possibleLines) == 2 && $lineName == ""){
		if(array_search("東京メトロ有楽町線", $possibleLines) !== FALSE && array_search("東京メトロ副都心線", $possibleLines) !== FALSE){
			return "東京メトロ有楽町線";
		}
	}
	return $lineName;
}

//着、発時間を抽出
function SearchTime($currentStation, $suffix)
{
	foreach($currentStation as $str)
	{
		if(strstr($str, $suffix))
		{
			return substr($str, 0, 5);
		}
	}
	return null;
}

//駅名の間違いを修正
function ModifyStationName($currentStation, $lineName)
{
	$modifyList = array();
	switch($lineName)
	{
		case "東京メトロ千代田線":
			$modifyList = array(
					"明治神宮前" => "明治神宮前〈原宿〉",
					"霞ヶ関" => "霞ケ関", //東京メトロの霞ケ関の「ケ」は正確には大文字らしい
			);
			break;
		case "東京メトロ日比谷線":
				$modifyList = array(
				"霞ヶ関" => "霞ケ関", //東京メトロの霞ケ関の「ケ」は正確には大文字らしい
				);
				break;
		case "東京メトロ有楽町線":
			$modifyList = array(
			"市ヶ谷" => "市ケ谷", //東京メトロの霞ケ関の「ケ」は正確には大文字らしい
			);
					break;
		case "小田急小田原線":
			$modifyList = array(
					"壓c" => "螢田" //何故か文字化けしている
			);
			break;
		//便宜的に修正
		case "京王新線":
			$modifyList = array(
				"新宿" => "新線新宿",
				);
			break;
		case "都営地下鉄新宿線":
			$modifyList = array(
				"新宿" => "新線新宿",
				);
			break;
		case "中央線快速":
			$modifyList = array(
			"阿佐ヶ谷" => "阿佐ケ谷",
			"千駄ヶ谷" => "千駄ケ谷",
			"市ヶ谷" => "市ケ谷"
				);
			break;
		case "中央・総武緩行線":
			$modifyList = array(
			"阿佐ヶ谷" => "阿佐ケ谷",
			"千駄ヶ谷" => "千駄ケ谷",
			"市ヶ谷" => "市ケ谷"
					);
			break;
		default:
			$modifyList = array(
					"壓c" => "螢田", //何故か文字化けしている
					"阿佐ヶ谷" => "阿佐ケ谷",
					"千駄ヶ谷" => "千駄ケ谷",
					"明治神宮前" => "明治神宮前〈原宿〉",
					"市ヶ谷" => "市ケ谷", //東京メトロのときだけ有効にすること 有楽町線に市ケ谷始発がある
			);
			break;
	}

	if(array_key_exists($currentStation, $modifyList))
	{
		return $modifyList[$currentStation];
	}
	return $currentStation;
}

//あさぎりなどの駅名と路線名の不一致を訂正する
function ModifyAsagiri(&$stationName, $lineName)
{
	$modifyList = array();
	switch($lineName)
	{
		case "御殿場線":
			$modifyList = array(
					"新松田" => "松田",
			);
			break;
		case "小田急小田原線":
			$modifyList = array(
					"松田" => "新松田",
			);
			break;
	}
	if(array_key_exists($stationName, $modifyList))
	{
		$stationName = $modifyList[$stationName];
	}
}

function ModifyTrainKind(&$kind, $lineName)
{
	$modifyList = array(
		"私鉄無料急行" => "急行",
		"私鉄無料特急" => "特急"
	);


	if(array_key_exists($kind, $modifyList))
	{
		$kind = $modifyList[$kind];
	}
}

//路線の変わる駅が通過駅である場合に、暫定的な通過時間を計算する
function CalcPassageTime($mysqli, $beforeLine, $beforeStation, $beforeTime, $passageStation1, $newTrain, $dom)
{
	$afterLine = $newTrain->lineName;
	//まず次の停車駅を見つける
	$bExistBeforeStation = false;
	foreach($dom->find('a[href*=station]') as $stationLink)
	{
		$station = $stationLink->parentNode()->parentNode()->parentNode()->parentNode();
		$currentStation = SplitItem($station->plaintext);
		if($bExistBeforeStation) ModifyStationName($currentStation[0], $afterLine);
		else ModifyStationName($currentStation[0], $beforeLine);
		$stationName = $currentStation[0];
		if($stationName == $beforeStation)
		{
			$bExistBeforeStation = true;
		}
		else if($bExistBeforeStation)
		{
			$afterTime = SearchTime($currentStation, '着');
			if($afterTime != null)
			{
				$afterStation = $stationName;
				break;
			}
		}
	}

	//ToDo:通過駅の駅名が路線ごとに違う場合もありうる
	$passageStation2 = $passageStation1;

	$kiloBefore = GetKiloFromDB($mysqli, $beforeLine, $beforeStation);
	$kiloPassage1 = GetKiloFromDB($mysqli, $beforeLine, $passageStation1);
	$kiloPassage2 = GetKiloFromDB($mysqli, $afterLine, $passageStation2);
	$kiloAfter = GetKiloFromDB($mysqli, $afterLine, $afterStation);


	$spanBefore = abs($kiloBefore - $kiloPassage1);
	$spanAfter = abs($kiloAfter - $kiloPassage2);

	$beforeDT = new DateTime($beforeTime);
	$afterDT = new DateTime($afterTime);

	$diff = $afterDT->diff($beforeDT, true);

	$passageDiffMinutes = (int)round($diff->i * $spanBefore / ($spanAfter+$spanBefore));
	$passageDT = $beforeDT->add(new DateInterval("PT".$passageDiffMinutes."M"));
	return $passageDT->format("H:i");
}

//通常の乗り入れ判断では処理できないものをまとめる
function SpecialChange($stationName, $currentLineName, $trainKind, $dom)
{
	if($stationName == "中野"){
		if($currentLineName == "東京メトロ東西線"){
			//return "中央・総武緩行線";
		}
	}
	if($stationName == "三鷹" && $trainKind == "普通"){
		if($currentLineName == "中央線快速"){
			return "中央・総武緩行線";
		}
	}
	if($stationName == "御茶ノ水" && $trainKind == "普通"){
		if($currentLineName == "中央線快速"){
			return "中央・総武緩行線";
		}
	}
	if($stationName == "溝の口" && $currentLineName == "東急田園都市線"){
		if(ExistStation($dom, "上野毛")){
			return "東急大井町線";
		}
	}
	if($stationName == "押上" && $currentLineName == "東京メトロ半蔵門線" && ExistStationAfter($dom, "北千住", "曳舟")){
		return "東武伊勢崎線(押上連絡線)";
	}
	if($stationName == "曳舟" && $currentLineName == "東武伊勢崎線" && ExistStationAfter($dom, "錦糸町", "押上")){
		return "東武伊勢崎線(押上連絡線)";
	}
	if($stationName == "横瀬" && $currentLineName == "西武秩父線" && ExistStationAfter($dom, "御花畑", "横瀬")){
		return "西武秩父線(秩鉄連絡線)";
	}
	if($stationName == "西武秩父" && $currentLineName == "西武秩父線" && ExistStationAfter($dom, "影森", "西武秩父")){
		return "秩父鉄道(西武連絡線)";
	}
	if($stationName == "御花畑" && $currentLineName == "秩父鉄道" && ExistStationAfter($dom, "横瀬", "御花畑")){
		return "西武秩父線(秩鉄連絡線)";
	}
	if($stationName == "影森" && $currentLineName == "秩父鉄道" && ExistStationAfter($dom, "西武秩父", "影森")){
		return "秩父鉄道(西武連絡線)";
	}
	return "";
}

//大井町線など列車種類を変える
function SpecialKindChange($currentLineName, $trainKind, $dom){
	if($currentLineName == "東急大井町線" && $trainKind == "各停"){
		foreach($dom->find('a[href*=station]') as $stationLink)
		{
			$station = $stationLink->parentNode()->parentNode()->parentNode()->parentNode();
			$currentStation = SplitItem($station->plaintext);
			$stationName = $currentStation[0];
			if($stationName == "二子新地"){
				//二子新地通過ならG各停
				if($currentStation[1] == 'レ' || (count($currentStation) > 2 && $currentStation[2] == 'レ'))
				{
					return "G各停";
				}else{
					return "B各停";
				}
			}
		}
		return "G各停";
	}
	if($currentLineName == "東急田園都市線" && ($trainKind == "B各停" || $trainKind == "G各停")) return "各停";
	return $trainKind;
}

//$domにある駅が存在するかどうか調べる
function ExistStation($dom, $target){
	foreach($dom->find('a[href*=station]') as $stationLink)
	{
		$station = $stationLink->parentNode()->parentNode()->parentNode()->parentNode();
		$currentStation = SplitItem($station->plaintext);
		$stationName = $currentStation[0];
		if($stationName == $target) return true;
	}
	return false;
}

function ExistStationAfter($dom, $target, $after){
	$bAfter = false;
	foreach($dom->find('a[href*=station]') as $stationLink)
	{
		$station = $stationLink->parentNode()->parentNode()->parentNode()->parentNode();
		$currentStation = SplitItem($station->plaintext);
		$stationName = $currentStation[0];
		if($bAfter && $stationName == $target) return true;
		if($after == $stationName) $bAfter = true;
	}
	return false;
}

//中央快速線など、htmlからゲットした時刻が信用できない場合の対処
function CheckFalseEndTime($route, $currentLine)
{
	if($currentLine == "中央線快速"){
		$startStations = array("吉祥寺", "武蔵境", "西国分寺", "武蔵小金井");
		$endStations = array("三鷹", "三鷹", "国分寺", "国分寺");
		$falseTimes = array(3, 3, 3, 3);
		for($i=0; $i<count($startStations); $i++){
			if($route->startStation == $startStations[$i] && $route->endStation == $endStations[$i]){
				$tStart = strtotime($route->startTime);
				$tEnd = strtotime($route->endTime);
				$aStart = getdate($tStart);
				if($aStart['hours'] < 4) $tStart += (60*60*24);
				$aEnd = getdate($tEnd);
				if($aEnd['hours'] < 4) $tEnd += (60*60*24);
				if($tStart < $tEnd && ($tEnd - $tStart > $falseTimes[$i] * 60)){
					//指定した時間より大きかった
					$tEnd -= ($tEnd - $tStart - ($falseTimes[$i] * 60));
					$aEnd = getdate($tEnd);
					$route->endTime = sprintf("%02d:%02d", $aEnd['hours'], $aEnd['minutes']);
					echo "到着時間変更：$route->endTime" . "<BR>";
				}
				break;
			}
		}
	}
}

function GetKiloFromDB($mysqli, $lineName, $stationName)
{
	$query = "SELECT kilo FROM tnstation WHERE linename='$lineName' and stationname='$stationName'";
	$result = ExecQuery($mysqli, $query);
	$row = $result->fetch_assoc();
	return floatval($row['kilo']);
}

class Train
{
	public $lineName, $trainName, $trainKind, $service;
	public $routes = array();
	public $nextTrain = null;

	public function ToTrainCsv()
	{
		$csv = "$this->lineName,$this->trainName,$this->service,$this->trainKind";
		if($this->nextTrain == null) $csv .= ",,";
		else $csv .= ",".$this->nextTrain->lineName.",".$this->nextTrain->trainName;
		return $csv;
	}

	public function ToRoutesCsv()
	{
		$csv = "";
		foreach($this->routes as $route)
		{
			$csv .= "$this->lineName,$this->trainName,$this->service,$route->startStation,$route->endStation,$route->startTime,$route->endTime\r\n";
		}
		return $csv;
	}
}

class Route
{
	public $startStation, $startTime, $endStation, $endTime;
}

?>