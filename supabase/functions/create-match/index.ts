import { handleRpcRequest } from '../_shared/rpc.ts';

Deno.serve(async (request) => {
  const body = await request.json();
  return handleRpcRequest(request, 'create_room', {
    p_name: body.name,
    p_difficulty: body.difficulty,
    p_max_players: body.maxPlayers,
    p_is_private: body.isPrivate ?? false,
    p_password_hash: body.password ?? null,
    p_puzzle: body.puzzle,
    p_solution: body.solution,
    p_initial_board: body.initialBoard,
    p_allow_hints: body.allowHints ?? true,
    p_allow_mistakes: body.allowMistakes ?? true,
    p_max_mistakes: body.maxMistakes ?? 5,
    p_freeze_duration: body.freezeDuration ?? 3,
    p_mega_freeze_duration: body.megaFreezeDuration ?? 10,
    p_entry_fee: body.entryFee ?? 0,
  });
});

