export const ls = {
    get(key: string) {
        try {
            const data = localStorage.getItem(key);

            return data ? JSON.parse(data) : undefined;
        } catch {
            // битый JSON или недоступный localStorage: считаем, что значения нет
            return undefined;
        }
    },

    set(key: string, value: string) {
        return localStorage.setItem(key, value);
    },

    remove(key: string) {
        return localStorage.removeItem(key);
    }
}
