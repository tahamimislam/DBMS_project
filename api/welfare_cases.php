<?php
// ── Welfare Cases API ──────────────────────────────────────
// GET  /api/welfare_cases.php        → return all cases
// POST /api/welfare_cases.php        → action=report | update_status

session_start();
header("Content-Type: application/json");
require "db.php";

// ─── GET: Return all welfare cases ────────────────────────
if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $sql = "
        SELECT
            wc.id,
            wc.reported_by,
            u1.full_name      AS reported_by_name,
            u1.phone          AS reported_by_phone,
            wc.case_type,
            wc.person_desc,
            wc.image_url,
            wc.location_street,
            wc.location_area,
            wc.location_city,
            wc.urgency,
            wc.notes,
            wc.rejected_by,
            wc.status,
            wc.handled_by,
            u2.full_name      AS handled_by_name,
            wc.handled_at,
            wc.created_at
        FROM welfare_cases wc
        LEFT JOIN users u1 ON wc.reported_by = u1.id
        LEFT JOIN users u2 ON wc.handled_by  = u2.id
        ORDER BY wc.created_at DESC
    ";

    $result = $conn->query($sql);
    $cases  = [];

    while ($row = $result->fetch_assoc()) {
        $cases[] = [
            "id"              => (int)$row["id"],
            "reportedBy"      => (int)$row["reported_by"],
            "reportedByName"  => $row["reported_by_name"],
            "reportedByPhone" => $row["reported_by_phone"],
            "caseType"        => $row["case_type"],
            "personDesc"      => $row["person_desc"],
            "imageUrl"        => $row["image_url"],
            "locationStreet"  => $row["location_street"],
            "locationArea"    => $row["location_area"],
            "locationCity"    => $row["location_city"],
            "urgency"         => $row["urgency"],
            "notes"           => $row["notes"],
            "rejectedBy"      => $row["rejected_by"],
            "status"          => $row["status"],
            "handledBy"       => $row["handled_by"] ? (int)$row["handled_by"] : null,
            "handledByName"   => $row["handled_by_name"],
            "handledAt"       => $row["handled_at"],
            "createdAt"       => $row["created_at"]
        ];
    }

    echo json_encode(["ok" => true, "cases" => $cases]);
    exit;
}

// ─── POST: Report a case or update status ─────────────────
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    if (!isset($_SESSION["user"])) {
        echo json_encode(["ok" => false, "msg" => "Not logged in."]);
        exit;
    }

    $data   = !empty($_POST) ? $_POST : (json_decode(file_get_contents("php://input"), true) ?? []);
    $action = trim($data["action"] ?? "");

    // ── Action: report ────────────────────────────────────
    if ($action === "report") {
        $reportedBy     = (int)$_SESSION["user"]["id"];
        $caseType       = trim($data["caseType"]       ?? "");
        $personDesc     = trim($data["personDesc"]     ?? "");
        $locationStreet = trim($data["locationStreet"] ?? "");
        $locationArea   = trim($data["locationArea"]   ?? "");
        $locationCity   = trim($data["locationCity"]   ?? "");
        $urgency        = trim($data["urgency"]        ?? "Medium");
        $notes          = trim($data["notes"]          ?? "");

        $allowed_types   = ["Medical","Homeless","Abandoned","Other"];
        $allowed_urgency = ["Low","Medium","High","Critical"];

        if (!in_array($caseType, $allowed_types)) {
            echo json_encode(["ok" => false, "msg" => "Invalid case type."]);
            exit;
        }
        if (!in_array($urgency, $allowed_urgency)) {
            echo json_encode(["ok" => false, "msg" => "Invalid urgency level."]);
            exit;
        }
        if (!$personDesc || !$locationStreet || !$locationArea || !$locationCity) {
            echo json_encode(["ok" => false, "msg" => "Description and full location are required."]);
            exit;
        }

        $imageUrl = null;
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = '../uploads/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
            $fileExt = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
            if (in_array($fileExt, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
                $fileName = uniqid('wc_') . '.' . $fileExt;
                if (move_uploaded_file($_FILES['image']['tmp_name'], $uploadDir . $fileName)) {
                    $imageUrl = 'uploads/' . $fileName;
                }
            }
        }

        $stmt = $conn->prepare(
            "INSERT INTO welfare_cases
             (reported_by, case_type, person_desc, image_url, location_street, location_area, location_city, urgency, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->bind_param("issssssss",
            $reportedBy, $caseType, $personDesc, $imageUrl,
            $locationStreet, $locationArea, $locationCity,
            $urgency, $notes
        );
        $stmt->execute();
        $newId = $conn->insert_id;
        $stmt->close();

        echo json_encode([
            "ok"  => true,
            "msg" => "Case reported successfully!",
            "case" => [
                "id"             => $newId,
                "reportedBy"     => $reportedBy,
                "reportedByName" => $_SESSION["user"]["fullName"] ?? "",
                "caseType"       => $caseType,
                "personDesc"     => $personDesc,
                "imageUrl"       => $imageUrl,
                "locationStreet" => $locationStreet,
                "locationArea"   => $locationArea,
                "locationCity"   => $locationCity,
                "urgency"        => $urgency,
                "notes"          => $notes,
                "status"         => "Pending",
                "handledBy"      => null,
                "handledByName"  => null,
                "handledAt"      => null,
                "createdAt"      => date("Y-m-d H:i:s")
            ]
        ]);
        exit;
    }

    // ── Action: update_status ─────────────────────────────
    if ($action === "update_status") {
        $accountType = $_SESSION["user"]["accountType"] ?? $_SESSION["user"]["account_type"] ?? "";
        if ($accountType !== "charity") {
            echo json_encode(["ok" => false, "msg" => "Only charity organizations can update case status."]);
            exit;
        }

        $caseId    = (int)($data["caseId"] ?? 0);
        $newStatus = trim($data["status"] ?? "");
        $allowed_statuses = ["Pending","Reviewing","Accepted","Action Taken","Completed"];

        if (!$caseId) {
            echo json_encode(["ok" => false, "msg" => "Case ID required."]);
            exit;
        }
        if (!in_array($newStatus, $allowed_statuses)) {
            echo json_encode(["ok" => false, "msg" => "Invalid status."]);
            exit;
        }

        $handledBy = (int)$_SESSION["user"]["id"];
        $now       = date("Y-m-d H:i:s");

        if ($newStatus === "Pending") {
            $stmt = $conn->prepare("UPDATE welfare_cases SET status = ?, handled_by = NULL, handled_at = NULL, rejected_by = CONCAT_WS(',', rejected_by, ?) WHERE id = ?");
            $strHandledBy = (string)$handledBy;
            $stmt->bind_param("ssi", $newStatus, $strHandledBy, $caseId);
        } else {
            $stmt = $conn->prepare("UPDATE welfare_cases SET status = ?, handled_by = ?, handled_at = ? WHERE id = ?");
            $stmt->bind_param("sisi", $newStatus, $handledBy, $now, $caseId);
        }
        $stmt->execute();
        $stmt->close();

        echo json_encode(["ok" => true, "msg" => "Case status updated.", "status" => $newStatus]);
        exit;
    }

    echo json_encode(["ok" => false, "msg" => "Unknown action."]);
    exit;
}

echo json_encode(["ok" => false, "msg" => "Method not allowed."]);
