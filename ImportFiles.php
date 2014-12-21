<?php
require_once 'funcs.php';
require_once 'simple_html_dom.php';

//えきから時刻表の列車時刻表よりURL一覧の一覧を作成 optionタグからゲットする
function MakeFileListList($url)
{
	$dom = file_get_html($url);
	$ret = array();
	foreach($dom->find('option') as $optionNode)
	{
		$list = createUri($url, $optionNode->getAttribute('value') . '.htm');
		$ret[] = $list;
	}
	return $ret;
}

//えきから時刻表の列車時刻表よりURL一覧を作成
function MakeFileList($url)
{
	$dom = file_get_html($url);
	$ret = array();
	foreach($dom->find('a[href*=detail]') as $detailNode)
	{
		$detailUrl = createUri($url, $detailNode->getAttribute('href'));
		if(!in_array($detailUrl, $ret))
		{
			$ret[] = $detailUrl;
		}
	}
	return $ret;
}

//MakeFileListで作ったURL一覧をダウンロード
function DownloadFileList($folder, $url, $list)
{
	if(!file_exists($folder)) mkdir($folder);
	$folder2 = basename($url, ".htm");
	//2014/12/17 down_1_1 → down_1_01に変換
	$pos = strrpos($folder2, "holi");
	if($pos !== FALSE){
		$folder2 = substr($folder2, 0, $pos-1);
	}
	$pos = strrpos($folder2, "_");
	if($pos !== FALSE){
		$subno = substr($folder2, $pos+1);
		if(strlen($subno) == 1){
			$folder2 = substr($folder2, 0, $pos+1) . "0" . $subno;
		}
	}
	$subfolder = pathCombine($folder, $folder2);
	if(!file_exists($subfolder)) mkdir($subfolder);
	$ct = 1;
	foreach($list as $item)
	{
		//??_ファイル名 として保存
		//掲載順に連番を付ける
		$fname = pathCombine($subfolder, sprintf("%02d_", $ct) . basename($item));
		$file = file_get_contents($item);
		$fp = fopen($fname, 'w');
		fwrite($fp, $file);
		fclose($fp);
		echo $fname . "<BR>";
		$ct++;
	}
}

?>