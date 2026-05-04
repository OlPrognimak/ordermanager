ALTER TABLE invoice
DROP CONSTRAINT invoice_rate_type_check;

ALTER TABLE invoice
ADD CONSTRAINT invoice_rate_type_check
CHECK (
(rate_type)::text = ANY (
ARRAY[
'DAILY_REVERSE_CHARGE',
'HOURLY_REVERSE_CHARGE',
'DAILY',
'HOURLY'
]::text[]
)
);
