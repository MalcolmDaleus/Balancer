<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\StoreIncomeStreamRequest;
use App\Http\Requests\Api\UpdateIncomeStreamRequest;
use App\Http\Resources\IncomeStreamResource;
use App\Models\IncomeStream;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class IncomeStreamController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', IncomeStream::class);

        $streams = IncomeStream::where('user_id', auth()->id())
            ->with('category')
            ->orderBy('name')
            ->get();

        return IncomeStreamResource::collection($streams);
    }

    public function store(StoreIncomeStreamRequest $request): IncomeStreamResource
    {
        $this->authorize('create', IncomeStream::class);

        $stream = IncomeStream::create(array_merge(
            $request->validated(),
            ['user_id' => auth()->id()]
        ));

        return new IncomeStreamResource($stream->load('category'));
    }

    public function show(IncomeStream $incomeStream): IncomeStreamResource
    {
        $this->authorize('view', $incomeStream);

        return new IncomeStreamResource($incomeStream->load('category'));
    }

    public function update(UpdateIncomeStreamRequest $request, IncomeStream $incomeStream): IncomeStreamResource
    {
        $this->authorize('update', $incomeStream);

        $incomeStream->update($request->validated());

        return new IncomeStreamResource($incomeStream->fresh()->load('category'));
    }

    public function destroy(IncomeStream $incomeStream): JsonResponse
    {
        $this->authorize('delete', $incomeStream);

        $incomeStream->delete();

        return response()->json(null, 204);
    }
}
