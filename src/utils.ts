export function range(start: number, end: number) {
	return {
		map: <T>(callback: (num: number) => T): T[] => {
			const result: T[] = []
			for (let i = start; i <= end; i += 1) {
				result.push(callback(i))
			}
			return result
		}
	}
}