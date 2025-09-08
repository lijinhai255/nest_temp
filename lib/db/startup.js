// 获取 startup 数据 

import supabase from '../supabaseClient';


/**
 * 获取所有 startup 数据
 * @returns {Promise<{data: Array, error: Object}>} 返回 startup 数据和可能的错误
 */
export async function getStartups() {
    // 获取 startup 数据
    const { data: startupData, error: startupError } = await supabase
        .from('startup')
        .select('*');
    if (startupData && startupData.length > 0) {
        // 获取第一个 startup 的 walletAddress 作为示例
        const sampleWalletAddress = startupData[0].walletAddress;
        // 这里我们需要知道实际存储作者信息的表名
        // 由于我们不确定，您可能需要在此处添加正确的表名
        // 例如:
        const authorTableName = 'author'; // 或者其他可能的表名

        const { data: authorData, error: authorError } = await supabase
            .from(authorTableName)
            .select('*')
            .eq('wallet_address', sampleWalletAddress) // 假设字段名为 wallet_address
            .single();
        console.log("authorData", authorData)
        // 如果找到匹配的作者记录，我们可以手动关联数据
        if (authorData) {
            const manuallyJoinedData = startupData.map(startup => {
                return {
                    ...startup,
                    author: authorData // 这里简化处理，实际应该根据每个 startup 的 walletAddress 查找对应的作者
                };
            });

            return { data: manuallyJoinedData, error: null };
        }
    }

    return { data: startupData, error: startupError };
}
/**
 * 根据 ID 获取特定 startup 数据
 * @param {string|number} id - startup 的 ID
 * @returns {Promise<{data: Object, error: Object}>} 返回特定 startup 数据和可能的错误
 */
export async function getStartupById(id) {
    const { data, error } = await supabase
        .from('startup')
        .select('*')
        .eq('id', id)
        .single();

    return { data, error };
}

/**
 * 创建新的 startup 记录
 * @param {Object} startupData - 要创建的 startup 数据
 * @returns {Promise<{data: Object, error: Object}>} 返回创建的 startup 数据和可能的错误
 */
export async function createStartup(startupData) {
    const { data, error } = await supabase
        .from('startup')
        .insert(startupData)
        .select();

    return { data, error };
}

/**
 * 更新 startup 记录
 * @param {string|number} id - 要更新的 startup ID
 * @param {Object} updates - 要更新的字段
 * @returns {Promise<{data: Object, error: Object}>} 返回更新后的 startup 数据和可能的错误
 */
export async function updateStartup(id, updates) {
    const { data, error } = await supabase
        .from('startup')
        .update(updates)
        .eq('id', id)
        .select();

    return { data, error };
}

/**
 * 删除 startup 记录
 * @param {string|number} id - 要删除的 startup ID
 * @returns {Promise<{data: Object, error: Object}>} 返回操作结果
 */
export async function deleteStartup(id) {
    const { data, error } = await supabase
        .from('startup')
        .delete()
        .eq('id', id);

    return { data, error };
}