// 获取 startup 数据 

import supabase from '../supabaseClient';

/**
 * 获取所有 startup 数据，并关联作者信息
 * @returns {Promise<{data: Array, error: Object}>} 返回 startup 数据和可能的错误
 */
export async function getStartups() {
    const { data, error } = await supabase
        .from('startup')
        .select();

    return { data, error };
}

/**
 * 根据 ID 获取特定 startup 数据
 * @param {string|number} id - startup 的 ID
 * @returns {Promise<{data: Object, error: Object}>} 返回特定 startup 数据和可能的错误
 */
export async function getStartupById(id) {
    const { data, error } = await supabase
        .from('startup')
        .select(`
            *,
            author:walletAddress (*)
        `)
        .eq('id', id)
        .single();

    return { data, error };
}

/**
 * 根据作者钱包地址获取其所有 startup
 * @param {string} walletAddress - 作者的钱包地址
 * @returns {Promise<{data: Array, error: Object}>} 返回该作者的所有 startup 数据和可能的错误
 */
export async function getStartupsByAuthor(walletAddress) {
    const { data, error } = await supabase
        .from('startup')
        .select(`
            *,
            author:walletAddress (*)
        `)
        .eq('walletAddress', walletAddress);

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

/**
 * 增加 startup 的浏览量
 * @param {string|number} id - startup 的 ID
 * @returns {Promise<{data: Object, error: Object}>} 返回更新后的数据和可能的错误
 */
export async function incrementStartupViews(id) {
    // 先获取当前的浏览量
    const { data: currentData, error: fetchError } = await supabase
        .from('startup')
        .select('views')
        .eq('id', id)
        .single();

    if (fetchError) {
        return { data: null, error: fetchError };
    }

    const currentViews = currentData.views || 0;

    // 更新浏览量
    const { data, error } = await supabase
        .from('startup')
        .update({ views: currentViews + 1 })
        .eq('id', id)
        .select();

    return { data, error };
}