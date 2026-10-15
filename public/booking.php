<?php
/**
 * Booking form handler for classic shared hosting (FORM_MODE=php).
 * Mirrors the rules in src/lib/booking.ts. Sends with PHP mail() and the
 * photos as attachments. Fill in the settings below on the server.
 */

// ---- Settings ---------------------------------------------------------------
const MAIL_TO   = 'hello@example.com';            // where requests go
const MAIL_FROM = 'website@example.com';          // must be a mailbox on this domain
const RATE_LIMIT = 5;                             // requests per IP …
const RATE_WINDOW = 600;                          // … per 10 minutes
// -----------------------------------------------------------------------------

const SERVICES = ['furniture', 'garage', 'estate', 'yard', 'storage', 'commercial', 'other'];
const TIMES = ['morning', 'afternoon', 'evening'];
const LANGS = ['en', 'es', 'ru'];
const MAX_FILES = 3;
const MAX_SIZE = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

$wantsJson = strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;
$lang = in_array($_POST['lang'] ?? '', LANGS, true) ? $_POST['lang'] : 'en';

function reply(int $status, array $body, string $anchor): void {
    global $wantsJson, $lang;
    if ($wantsJson) {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($body);
    } else {
        header('Location: ' . ($lang === 'en' ? '/' : "/$lang/") . "#$anchor", true, 303);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    reply(405, ['ok' => false], 'booking-error');
}

// Honeypot
if (trim($_POST['company_website'] ?? '') !== '') reply(200, ['ok' => true], 'booking-sent');

// Rate limit (file-based, per IP)
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rlFile = sys_get_temp_dir() . '/booking_rl_' . md5($ip);
$now = time();
$hits = array_filter(
    is_file($rlFile) ? (array) json_decode((string) file_get_contents($rlFile), true) : [],
    fn($t) => $now - (int) $t < RATE_WINDOW
);
$hits[] = $now;
file_put_contents($rlFile, json_encode(array_values($hits)));
if (count($hits) > RATE_LIMIT) reply(429, ['ok' => false, 'error' => 'rate_limited'], 'booking-error');

$s = fn($k, $max = 200) => mb_substr(trim((string) ($_POST[$k] ?? '')), 0, $max);
$d = [
    'name' => $s('name', 120),
    'phone' => $s('phone', 40),
    'email' => $s('email'),
    'zip' => $s('zip', 10),
    'service' => $s('service'),
    'date' => $s('date', 10),
    'time' => $s('time'),
    'description' => $s('description', 2000),
];

$errors = [];
if (mb_strlen($d['name']) < 2) $errors['name'] = 'required';
$digits = preg_replace('/\D/', '', $d['phone']);
if (strlen($digits) === 11 && $digits[0] === '1') $digits = substr($digits, 1);
if ($d['phone'] === '') $errors['phone'] = 'required';
elseif (strlen($digits) !== 10) $errors['phone'] = 'phone';
if ($d['email'] !== '' && !filter_var($d['email'], FILTER_VALIDATE_EMAIL)) $errors['email'] = 'email';
if ($d['zip'] === '') $errors['zip'] = 'required';
elseif (!preg_match('/^\d{5}$/', $d['zip'])) $errors['zip'] = 'zip';
if (!in_array($d['service'], SERVICES, true)) $errors['service'] = 'required';
if ($d['date'] !== '') {
    $today = (new DateTime('now', new DateTimeZone('America/Los_Angeles')))->format('Y-m-d');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $d['date']) || $d['date'] < $today) $errors['date'] = 'date';
}
if ($d['time'] !== '' && !in_array($d['time'], TIMES, true)) $errors['time'] = 'required';

// Files
// The page's script sends files as photos[] (several); a no-JS post sends one as photos.
$files = [];
if (!empty($_FILES['photos'])) {
    $p = $_FILES['photos'];
    $count = is_array($p['name']) ? count($p['name']) : 1;
    for ($i = 0; $i < $count; $i++) {
        $get = fn($k) => is_array($p[$k]) ? $p[$k][$i] : $p[$k];
        if ($get('error') === UPLOAD_ERR_NO_FILE) continue;
        $files[] = [
            'name' => preg_replace('/[^\w.\- ]/', '_', (string) $get('name')),
            'tmp' => $get('tmp_name'),
            'size' => $get('size'),
            'error' => $get('error'),
        ];
    }
}
if (count($files) > MAX_FILES) $errors['photos'] = 'fileCount';
foreach ($files as $f) {
    if ($f['error'] !== UPLOAD_ERR_OK || $f['size'] > MAX_SIZE) { $errors['photos'] = 'fileSize'; break; }
    $type = mime_content_type($f['tmp']);
    if (!in_array($type, TYPES, true)) { $errors['photos'] = 'fileType'; break; }
}

if ($errors) reply(422, ['ok' => false, 'errors' => $errors], 'booking-error');

// Build the email
$body = "Name: {$d['name']}\nPhone: {$d['phone']}\nEmail: " . ($d['email'] ?: '-') .
    "\nZIP: {$d['zip']}\nService: {$d['service']}\nDate: " . ($d['date'] ?: '-') .
    "\nTime window: " . ($d['time'] ?: '-') . "\nSite language: " . strtoupper($lang) .
    "\n\nDescription:\n" . ($d['description'] ?: '-') . "\n";

$boundary = 'b' . bin2hex(random_bytes(12));
$headers = "From: " . MAIL_FROM . "\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=\"$boundary\"";
if ($d['email'] !== '' && !isset($errors['email'])) $headers .= "\r\nReply-To: " . str_replace(["\r", "\n"], '', $d['email']);

$msg = "--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n$body\r\n";
foreach ($files as $f) {
    $type = mime_content_type($f['tmp']);
    $msg .= "--$boundary\r\nContent-Type: $type; name=\"{$f['name']}\"\r\nContent-Transfer-Encoding: base64\r\n" .
        "Content-Disposition: attachment; filename=\"{$f['name']}\"\r\n\r\n" .
        chunk_split(base64_encode((string) file_get_contents($f['tmp']))) . "\r\n";
}
$msg .= "--$boundary--";

$subject = '=?UTF-8?B?' . base64_encode("New pickup request: {$d['name']}, {$d['zip']}") . '?=';
if (!mail(MAIL_TO, $subject, $msg, $headers)) reply(502, ['ok' => false, 'error' => 'send_failed'], 'booking-error');

reply(200, ['ok' => true], 'booking-sent');
