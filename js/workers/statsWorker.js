// Stats Web Worker
// Reçoit des messages pour effectuer des agrégations lourdes hors du thread UI

self.onmessage = (e) => {
	const { type, payload } = e.data || {};

	if (type === 'mapStats') {
		const matches = Array.isArray(payload?.matches) ? payload.matches : [];
		const result = {};
		for (const m of matches) {
			const map = m?.map || 'Unknown';
			if (!result[map]) result[map] = { matches: 0, victories: 0, defeats: 0 };
			result[map].matches += 1;
			const res = (m?.result || '').toLowerCase();
			if (res === 'win' || res === 'victoire') result[map].victories += 1;
			else if (res === 'loss' || res === 'défaite' || res === 'defaite') result[map].defeats += 1;
		}
		self.postMessage({ type: 'mapStats:done', payload: { result } });
		return;
	}

	if (type === 'roundStats') {
		const matches = Array.isArray(payload?.matches) ? payload.matches : [];
		const stats = {
			gun_rounds: { wins: 0, losses: 0 },
			eco_rounds: { wins: 0, losses: 0 },
			anti_eco_rounds: { wins: 0, losses: 0 },
			bonus_rounds: { wins: 0, losses: 0 },
			full_buy_rounds: { wins: 0, losses: 0 },
			force_buy_rounds: { wins: 0, losses: 0 },
			attack_rounds: { wins: 0, losses: 0 },
			defense_rounds: { wins: 0, losses: 0 },
			total_rounds: { wins: 0, losses: 0 }
		};
		for (const match of matches) {
			const rounds = Array.isArray(match?.rounds) ? match.rounds : [];
			for (const round of rounds) {
				if (!round?.winner) continue;
				const isWin = round.winner === 'Nous';
				// type
				if (round?.type) {
					const typeKey = String(round.type).toLowerCase().replace(' ', '_') + '_rounds';
					if (stats[typeKey]) {
						if (isWin) stats[typeKey].wins++; else stats[typeKey].losses++;
					}
				}
				// side
				if (round?.side) {
					const sideKey = round.side === 'Attaque' ? 'attack_rounds' : 'defense_rounds';
					if (stats[sideKey]) {
						if (isWin) stats[sideKey].wins++; else stats[sideKey].losses++;
					}
				}
				if (isWin) stats.total_rounds.wins++; else stats.total_rounds.losses++;
			}
		}
		self.postMessage({ type: 'roundStats:done', payload: { stats } });
		return;
	}

	self.postMessage({ type: 'error', payload: { message: 'Unknown worker task' } });
};


