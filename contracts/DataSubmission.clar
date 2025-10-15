(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-LOCATION u101)
(define-constant ERR-INVALID-NEED-TYPE u102)
(define-constant ERR-INVALID-QUANTITY u103)
(define-constant ERR-INVALID-URGENCY u104)
(define-constant ERR-INVALID-DESCRIPTION u105)
(define-constant ERR-INVALID-HASH u106)
(define-constant ERR-SUBMISSION-ALREADY-EXISTS u107)
(define-constant ERR-SUBMISSION-NOT-FOUND u108)
(define-constant ERR-INVALID-TIMESTAMP u109)
(define-constant ERR-USER-NOT-REGISTERED u110)
(define-constant ERR-INVALID-STATUS u111)
(define-constant ERR-INVALID-LATITUDE u112)
(define-constant ERR-INVALID-LONGITUDE u113)
(define-constant ERR-INVALID-EVIDENCE u114)
(define-constant ERR-MAX-SUBMISSIONS-EXCEEDED u115)
(define-constant ERR-INVALID-UPDATE-PARAM u116)
(define-constant ERR-UPDATE-NOT-ALLOWED u117)
(define-constant ERR-INVALID-CATEGORY u118)
(define-constant ERR-INVALID-UNIT u119)
(define-constant ERR-INVALID-EXPIRY u120)

(define-data-var next-submission-id uint u0)
(define-data-var max-submissions uint u10000)
(define-data-var submission-fee uint u500)
(define-data-var registry-contract (optional principal) none)

(define-map submissions
  uint
  {
    location: (string-ascii 50),
    latitude: int,
    longitude: int,
    need-type: (string-ascii 30),
    quantity: uint,
    unit: (string-ascii 20),
    urgency: uint,
    description: (string-utf8 500),
    evidence-hash: (buff 32),
    timestamp: uint,
    submitter: principal,
    category: (string-ascii 20),
    status: bool,
    expiry: uint
  }
)

(define-map submissions-by-hash
  (buff 32)
  uint)

(define-map submission-updates
  uint
  {
    update-quantity: uint,
    update-urgency: uint,
    update-description: (string-utf8 500),
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-submission (id uint))
  (map-get? submissions id)
)

(define-read-only (get-submission-updates (id uint))
  (map-get? submission-updates id)
)

(define-read-only (is-submission-registered (hash (buff 32)))
  (is-some (map-get? submissions-by-hash hash))
)

(define-private (validate-location (loc (string-ascii 50)))
  (if (and (> (len loc) u0) (<= (len loc) u50))
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-latitude (lat int))
  (if (and (>= lat -90000000) (<= lat 90000000))
      (ok true)
      (err ERR-INVALID-LATITUDE))
)

(define-private (validate-longitude (lon int))
  (if (and (>= lon -180000000) (<= lon 180000000))
      (ok true)
      (err ERR-INVALID-LONGITUDE))
)

(define-private (validate-need-type (ntype (string-ascii 30)))
  (if (or (is-eq ntype "food") (is-eq ntype "water") (is-eq ntype "shelter") (is-eq ntype "medical"))
      (ok true)
      (err ERR-INVALID-NEED-TYPE))
)

(define-private (validate-quantity (qty uint))
  (if (> qty u0)
      (ok true)
      (err ERR-INVALID-QUANTITY))
)

(define-private (validate-unit (unit (string-ascii 20)))
  (if (and (> (len unit) u0) (<= (len unit) u20))
      (ok true)
      (err ERR-INVALID-UNIT))
)

(define-private (validate-urgency (urg uint))
  (if (and (>= urg u1) (<= urg u10))
      (ok true)
      (err ERR-INVALID-URGENCY))
)

(define-private (validate-description (desc (string-utf8 500)))
  (if (<= (len desc) u500)
      (ok true)
      (err ERR-INVALID-DESCRIPTION))
)

(define-private (validate-evidence-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
      (ok true)
      (err ERR-INVALID-HASH))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-category (cat (string-ascii 20)))
  (if (or (is-eq cat "emergency") (is-eq cat "ongoing") (is-eq cat "recovery"))
      (ok true)
      (err ERR-INVALID-CATEGORY))
)

(define-private (validate-expiry (exp uint))
  (if (> exp block-height)
      (ok true)
      (err ERR-INVALID-EXPIRY))
)

(define-private (validate-submitter (sub principal))
  (ok true)
)

(define-public (set-registry-contract (contract-principal principal))
  (begin
    (asserts! (is-none (var-get registry-contract)) (err ERR-NOT-AUTHORIZED))
    (var-set registry-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-submissions (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get registry-contract)) (err ERR-NOT-AUTHORIZED))
    (var-set max-submissions new-max)
    (ok true)
  )
)

(define-public (set-submission-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get registry-contract)) (err ERR-NOT-AUTHORIZED))
    (var-set submission-fee new-fee)
    (ok true)
  )
)

(define-public (submit-data
  (location (string-ascii 50))
  (latitude int)
  (longitude int)
  (need-type (string-ascii 30))
  (quantity uint)
  (unit (string-ascii 20))
  (urgency uint)
  (description (string-utf8 500))
  (evidence-hash (buff 32))
  (category (string-ascii 20))
  (expiry uint)
)
  (let (
        (next-id (var-get next-submission-id))
        (current-max (var-get max-submissions))
        (registry (var-get registry-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-SUBMISSIONS-EXCEEDED))
    (try! (validate-location location))
    (try! (validate-latitude latitude))
    (try! (validate-longitude longitude))
    (try! (validate-need-type need-type))
    (try! (validate-quantity quantity))
    (try! (validate-unit unit))
    (try! (validate-urgency urgency))
    (try! (validate-description description))
    (try! (validate-evidence-hash evidence-hash))
    (try! (validate-category category))
    (try! (validate-expiry expiry))
    (asserts! (is-none (map-get? submissions-by-hash evidence-hash)) (err ERR-SUBMISSION-ALREADY-EXISTS))
    (let ((registry-recipient (unwrap! registry (err ERR-NOT-AUTHORIZED))))
      (try! (stx-transfer? (var-get submission-fee) tx-sender registry-recipient))
    )
    (map-set submissions next-id
      {
        location: location,
        latitude: latitude,
        longitude: longitude,
        need-type: need-type,
        quantity: quantity,
        unit: unit,
        urgency: urgency,
        description: description,
        evidence-hash: evidence-hash,
        timestamp: block-height,
        submitter: tx-sender,
        category: category,
        status: true,
        expiry: expiry
      }
    )
    (map-set submissions-by-hash evidence-hash next-id)
    (var-set next-submission-id (+ next-id u1))
    (print { event: "data-submitted", id: next-id })
    (ok next-id)
  )
)

(define-public (update-submission
  (submission-id uint)
  (update-quantity uint)
  (update-urgency uint)
  (update-description (string-utf8 500))
)
  (let ((submission (map-get? submissions submission-id)))
    (match submission
      s
        (begin
          (asserts! (is-eq (get submitter s) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-quantity update-quantity))
          (try! (validate-urgency update-urgency))
          (try! (validate-description update-description))
          (map-set submissions submission-id
            {
              location: (get location s),
              latitude: (get latitude s),
              longitude: (get longitude s),
              need-type: (get need-type s),
              quantity: update-quantity,
              unit: (get unit s),
              urgency: update-urgency,
              description: update-description,
              evidence-hash: (get evidence-hash s),
              timestamp: block-height,
              submitter: (get submitter s),
              category: (get category s),
              status: (get status s),
              expiry: (get expiry s)
            }
          )
          (map-set submission-updates submission-id
            {
              update-quantity: update-quantity,
              update-urgency: update-urgency,
              update-description: update-description,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "submission-updated", id: submission-id })
          (ok true)
        )
      (err ERR-SUBMISSION-NOT-FOUND)
    )
  )
)

(define-public (get-submission-count)
  (ok (var-get next-submission-id))
)

(define-public (check-submission-existence (hash (buff 32)))
  (ok (is-submission-registered hash))
)