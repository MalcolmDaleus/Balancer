<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\StoreRecurringPaymentStreamRequest;
use App\Http\Requests\Api\UpdateRecurringPaymentStreamRequest;
use App\Http\Resources\RecurringPaymentStreamResource;
use App\Models\RecurringPaymentStream;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RecurringPaymentStreamController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', RecurringPaymentStream::class);

        $streams = RecurringPaymentStream::where('user_id', auth()->id())
            ->with(['category', 'entries'])
            ->orderBy('name')
            ->get();

        return RecurringPaymentStreamResource::collection($streams);
    }

    public function store(StoreRecurringPaymentStreamRequest $request): RecurringPaymentStreamResource
    {
        $this->authorize('create', RecurringPaymentStream::class);

        $stream = RecurringPaymentStream::create(array_merge(
            $request->validated(),
            ['user_id' => auth()->id()]
        ));

        return new RecurringPaymentStreamResource($stream->load(['category', 'entries']));
    }

    public function show(RecurringPaymentStream $recurringPaymentStream): RecurringPaymentStreamResource
    {
        $this->authorize('view', $recurringPaymentStream);

        return new RecurringPaymentStreamResource($recurringPaymentStream->load(['category', 'entries']));
    }

    public function update(UpdateRecurringPaymentStreamRequest $request, RecurringPaymentStream $recurringPaymentStream): RecurringPaymentStreamResource
    {
        $this->authorize('update', $recurringPaymentStream);

        $recurringPaymentStream->update($request->validated());

        return new RecurringPaymentStreamResource($recurringPaymentStream->fresh()->load(['category', 'entries']));
    }

    /**
     * Streams are always soft-deleted once they exist — never hard-deleted.
     * Hard deletion would orphan historical purchases linked to the stream's entries.
     */
    public function destroy(RecurringPaymentStream $recurringPaymentStream): JsonResponse
    {
        $this->authorize('delete', $recurringPaymentStream);

        $recurringPaymentStream->delete(); // always soft delete

        return response()->json(null, 204);
    }
}
