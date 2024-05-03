module.exports = {
    guilds: {
        get: async function(id) {
            try {
                const res = await fetch(`https://discord.com/api/v10/guilds/${id}`, {
                    headers: {
                        Authorization: `Bot ${process.env.client_token}`
                    }
                }).then(res => res.json());

                if (res.message === "Unknown Guild") {
                    return {
                        success: true,
                        in: false
                    }
                }

                return {
                    success: true,
                    in: true,
                    res
                }
            } catch (error) {
                return {
                    success: false,
                    in: false,
                    error
                };
            }
        },
    }
}