<?php
/* ShowIP (c) 2007 Jan Dittmer <jdi@l4x.org */
/* Simple script to always show the newest version in the
   rdf feed to make releases just a cp of the new file to
   the public directory */
/* config */
$guid = '3e9bb2a7-62ca-4efa-a4e6-f6f6168a652d';
$dir = '/var/www/site/files/';
$site = 'http://l4x.org/site/files/';
$basename = 'showip_';

if (isset($_GET['v'])) {
	$v = pg_escape_string($_GET['v']);
	/* Log version, unused
	$db = @pg_connect('dbname=showip');
	@pg_query($db, "INSERT INTO version VALUES('$v');");
	@pg_close($db);
	*/
}

/* program starts here */
$v = array();
$d = opendir($dir);
while(($f = readdir($d))!== false) {
	// disable for now
	if (stristr($f, '04'))
		continue;
	if (stristr($f, $basename))
		$v[] = $f;
}
closedir($d);
natsort($v);
$currfile = array_pop($v);

$version = substr(basename($currfile, '.xpi'), strlen($basename));
$version = str_replace('_', '.', $version);
// $version = '0.7.0';

header("Content-Type: text/xml");
print "<?xml version=\"1.0\"?>\n\n";
?>
<RDF:RDF xmlns:RDF="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:em="http://www.mozilla.org/2004/em-rdf#">

<RDF:Description about="urn:mozilla:extension:{<?=$guid?>}">

	<em:updates>
		<RDF:Seq>
			<RDF:li resource="urn:mozilla:extension:{<?=$guid?>}:<?=$version?>"/>
		</RDF:Seq>
	</em:updates>
	<em:version><?=$version?></em:version>
	<em:updateLink><?=$site.$currfile?></em:updateLink>
</RDF:Description>

<RDF:Description about="urn:mozilla:extension:{<?=$guid?>}:<?=$version?>">
	<em:version><?=$version?></em:version>

	<em:targetApplication>
		<RDF:Description>
			<em:id>{ec8030f7-c20a-464f-9b0e-13a3a9e97384}</em:id> <!-- firefox -->
			<em:minVersion>1.0</em:minVersion>
			<em:maxVersion>2.0.*</em:maxVersion>
			<em:updateLink><?=$site.$currfile?></em:updateLink>
		</RDF:Description>
	</em:targetApplication>

	<em:targetApplication>
		<RDF:Description>
			<em:id>{86c18b42-e466-45a9-ae7a-9b95ba6f5640}</em:id> <!-- mozilla -->
			<em:minVersion>1.0</em:minVersion>
			<em:maxVersion>1.8+</em:maxVersion>
			<em:updateLink><?=$site.$currfile?></em:updateLink>
		</RDF:Description>
	</em:targetApplication>

</RDF:Description>  


</RDF:RDF>
