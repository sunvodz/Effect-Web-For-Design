<?php
/**
 * Text + Lens Blur — PHP demo (CSS-only, no canvas)
 * --------------------------------------------------
 * Server-side configurable version of index.html.
 * Query params: ?text=Hello%0AWorld&mode=fill|stroke
 *
 * Run locally:  php -S localhost:8000  (then open http://localhost:8000)
 */

// สไตล์ทั้งหมด (สี ฟอนต์ line-height text-align) อยู่ใน scss/style.scss —
// ที่นี่มีเฉพาะเนื้อหา (ตัวหนังสือเป็น HTML จริง ไม่มี canvas)
$config = [
    // "\n" in the text = new line
    'text' => isset($_GET['text']) && trim((string) $_GET['text']) !== ''
        ? mb_substr(trim((string) $_GET['text']), 0, 100)
        : 'Trust our\nCraftsmanship',
    'mode' => (isset($_GET['mode']) && in_array($_GET['mode'], ['fill', 'stroke'], true))
        ? $_GET['mode']
        : 'fill',
];

$h = static fn (string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');

// escape first, then convert "\n" to <br>
$textHtml = nl2br($h(str_replace('\n', "\n", $config['text'])), false);
?>
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>Text + SDF Lens Blur — <?= $h(str_replace('\n', ' ', $config['text'])) ?></title>
	<meta name="description" content="Interactive SDF lens blur effect applied to text, based on the Codrops SDF Lens Blur demo." />
	<!-- fallback for "Bebas Neue Pro" (commercial): free Bebas Neue from Google Fonts -->
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" />
	<link rel="stylesheet" href="css/style.css" />
</head>
<body>
	<!-- ตัวหนังสือเป็น HTML จริง (ไม่มี canvas) — เอฟเฟกต์ทำด้วย CSS mask -->
	<div class="lensblur demo-stage<?= $config['mode'] === 'stroke' ? ' lensblur--stroke' : '' ?>" data-lensblur>
		<p class="lensblur__text"><?= $textHtml ?></p>
	</div>

	<header class="frame">
		<h1 class="frame__title">Text + SDF Lens Blur</h1>
		<nav class="frame__demos">
			<span>Variations:</span>
			<a<?= $config['mode'] === 'stroke' ? ' class="selected"' : '' ?> href="?text=<?= urlencode($config['text']) ?>&amp;mode=stroke">Stroke</a>
			<a<?= $config['mode'] === 'fill' ? ' class="selected"' : '' ?> href="?text=<?= urlencode($config['text']) ?>&amp;mode=fill">Fill</a>
		</nav>
		<nav class="frame__links">
			<a href="https://tympanus.net/Tutorials/SDFLensBlur/index.html?var=2">Original demo</a>
			<a href="https://github.com/guilanier/codrops-sdf-lensblur">Original source</a>
		</nav>
		<nav class="frame__tags">
			<span>#webgl</span>
			<span>#sdf</span>
			<span>#shader</span>
		</nav>
	</header>

	<script src="js/main.js"></script>
</body>
</html>
