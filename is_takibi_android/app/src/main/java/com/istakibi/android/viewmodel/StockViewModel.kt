package com.istakibi.android.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.istakibi.android.model.StockCombi
import com.istakibi.android.repository.StockRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class StockViewModel : ViewModel() {
    private val repository = StockRepository()

    private val _stocks = MutableStateFlow<List<StockCombi>>(emptyList())
    val stocks: StateFlow<List<StockCombi>> = _stocks

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery

    init {
        fetchStocks()
    }

    private fun fetchStocks() {
        viewModelScope.launch {
            repository.getStocks().collect { stockList ->
                _stocks.value = stockList
                _isLoading.value = false
            }
        }
    }

    fun onSearchQueryChanged(query: String) {
        _searchQuery.value = query
    }

    fun addStock(stock: StockCombi) {
        viewModelScope.launch {
            repository.addStock(stock)
        }
    }

    fun updateStock(stock: StockCombi) {
        viewModelScope.launch {
            repository.updateStock(stock)
        }
    }

    fun deleteStock(stockId: String) {
        viewModelScope.launch {
            repository.deleteStock(stockId)
        }
    }
}
