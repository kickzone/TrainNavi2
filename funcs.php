<?php
function OpenDb(){
	// mysqlへの接続
	$mysqli = new mysqli("127.0.0.1", "root", "nyounyou");
	if ($mysqli->connect_errno) {
		print('<p>データベースへの接続に失敗しました。</p>' . $mysqli->connect_error);
		exit();
	}

	// データベースの選択
	$mysqli->select_db("TrainNavi2");


	return $mysqli;
}


function ExecQuery($mysqli, $query){
	$result = $mysqli->query($query);
	if (!$result) {
		print('クエリーが失敗しました。' . $mysqli->error);
		$mysqli->close();
		exit();
	}
	return $result;
}

/**
 * createUri
 * 相対パスから絶対URLを返します
 *
 * @param string $base ベースURL（絶対URL）
 * @param string $relational_path 相対パス
 * @return string 相対パスの絶対URL
 * @link http://blog.anoncom.net/2010/01/08/295.html/comment-page-1
 */
function createUri( $base, $relationalPath )
{
	$parse = array(
			"scheme" => null,
			"user" => null,
			"pass" => null,
			"host" => null,
			"port" => null,
			"query" => null,
			"fragment" => null
	);
	$parse = parse_url( $base );

	if( strpos($parse["path"], "/", (strlen($parse["path"])-1)) !== false ){
		$parse["path"] .= ".";
	}

	if( preg_match("#^https?\://#", $relationalPath) ){
		return $relationalPath;
	}else if( preg_match("#^/.*$#", $relationalPath) ){
		return $parse["scheme"] . "://" . $parse["host"] . $relationalPath;
	}else{
		$basePath = explode("/", dirname($parse["path"]));
		$relPath = explode("/", $relationalPath);
		foreach( $relPath as $relDirName ){
			if( $relDirName == "." ){
				array_shift( $basePath );
				array_unshift( $basePath, "" );
			}else if( $relDirName == ".." ){
				array_pop( $basePath );
				if( count($basePath) == 0 ){
					$basePath = array("");
				}
			}else{
				array_push($basePath, $relDirName);
			}
		}
		$path = implode("/", $basePath);
		return $parse["scheme"] . "://" . $parse["host"] . $path;
	}

}

function pathCombine($dir, $file)
{
	/*
	 * 文字列の最後のスラッシュまたはバックスラッシュを除去し、
	* ファイル名を連結する
	*/
	return rtrim($dir, '\\/') . DIRECTORY_SEPARATOR . $file;
}

?>