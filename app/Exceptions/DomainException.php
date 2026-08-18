<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Domain / business-rule failure for the API.
 *
 * Rendered in bootstrap/app.php as JSON:
 *   { "error": "<code>", "message": "<human text>", ...$extra }
 *
 * Use for non-field failures (already_refunded, classifier_locked, has_facts, …).
 * Field validation stays on FormRequest → ValidationException → details.
 */
class DomainException extends RuntimeException
{
    public function __construct(
        public readonly string $error,
        string $message,
        public readonly int $status = 422,
        public readonly array $extra = [],
    ) {
        parent::__construct($message);
    }
}
