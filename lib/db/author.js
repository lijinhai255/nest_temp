import supabase from '../supabaseClient';
import { Author } from "@/types/index"
/**
 * 获取所有作者信息
 * @returns {Promise<{data: Array<Author>|null, error: Error|null}>} 作者数据和可能的错误
 */
export async function getAuthors() {
    const { data, error } = await supabase
        .from('author')
        .select('*');

    return { data, error };
}

/**
 * 根据钱包地址获取作者信息
 * @param {string} walletAddress - 作者的钱包地址
 * @returns {Promise<{data: object|null, error: Error|null}>} 作者数据和可能的错误
 */
export async function getAuthorByWalletAddress(walletAddress) {
    const { data, error } = await supabase
        .from('author')
        .select('*')
        .eq('walletAddress', walletAddress)
        .single();

    return { data, error };
}

/**
 * 创建新作者
 * @param {object} authorData - 作者数据
 * @param {string} authorData.walletAddress - 作者钱包地址（必填）
 * @param {string} [authorData.name] - 作者姓名
 * @param {string} [authorData.username] - 作者用户名
 * @param {string} [authorData.email] - 作者邮箱
 * @param {string} [authorData.bio] - 作者简介
 * @param {string} [authorData.image] - 作者头像
 * @returns {Promise<{data: object|null, error: Error|null}>} 创建的作者数据和可能的错误
 */
export async function createAuthor(authorData) {
    const { data, error } = await supabase
        .from('author')
        .insert([authorData])
        .select();

    return { data: data?.[0] || null, error };
}

/**
 * 更新作者信息
 * @param {string} walletAddress - 作者的钱包地址
 * @param {object} updates - 需要更新的字段
 * @returns {Promise<{data: object|null, error: Error|null}>} 更新后的作者数据和可能的错误
 */
export async function updateAuthor(walletAddress, updates) {
    const { data, error } = await supabase
        .from('author')
        .update(updates)
        .eq('walletAddress', walletAddress)
        .select();

    return { data: data?.[0] || null, error };
}

/**
 * 删除作者
 * @param {string} walletAddress - 作者的钱包地址
 * @returns {Promise<{data: object|null, error: Error|null}>} 操作结果和可能的错误
 */
export async function deleteAuthor(walletAddress) {
    const { data, error } = await supabase
        .from('author')
        .delete()
        .eq('walletAddress', walletAddress)
        .select();

    return { data: data?.[0] || null, error };
}

/**
 * 获取作者及其创建的所有项目
 * @param {string} walletAddress - 作者的钱包地址
 * @returns {Promise<{data: object|null, error: Error|null}>} 作者数据（包含项目）和可能的错误
 */
export async function getAuthorWithStartups(walletAddress) {
    const { data, error } = await supabase
        .from('author')
        .select(`
            *,
            startups:startup(*)
        `)
        .eq('walletAddress', walletAddress)
        .single();

    return { data, error };
}