<?php
    header('Access-Control-Allow-Origin: *');

    $userid = "0ee12d2d4a";
    $secretkey = "fti8Wll50D";
    $writeToken = "71a700d0-9228-4b8b-97f8-f92cc6616fa9";
    $readToken = "802f85da-ac2d-4106-978c-637ff8cc2307";

    $ts = time() * 1000;
    $hash = md5($ts . $writeToken);
    $sign = md5($secretkey . $ts);

    $response = array();
    $response['ts'] = $ts;
    $response['hash'] = $hash;
    $response['sign'] = $sign;
    $response['userid'] = $userid;
    $response['readToken'] = $readToken;

    echo json_encode($response);
    
?>