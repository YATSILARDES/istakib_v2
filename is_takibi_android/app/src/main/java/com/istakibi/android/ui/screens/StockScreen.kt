package com.istakibi.android.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.istakibi.android.model.StockCombi
import com.istakibi.android.viewmodel.StockViewModel

@Composable
fun StockScreen(
    viewModel: StockViewModel = viewModel()
) {
    val stocks by viewModel.stocks.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()

    var selectedStock by remember { mutableStateOf<StockCombi?>(null) }
    
    if (selectedStock != null) {
        StockDetailView(
            stock = selectedStock!!,
            onBackClick = { selectedStock = null },
            viewModel = viewModel
        )
    } else {
        StockListView(
            stocks = stocks,
            isLoading = isLoading,
            searchQuery = searchQuery,
            onSearchQueryChanged = { viewModel.onSearchQueryChanged(it) },
            onStockClick = { selectedStock = it }
        )
    }
}

@Composable
fun StockListView(
    stocks: List<StockCombi>,
    isLoading: Boolean,
    searchQuery: String,
    onSearchQueryChanged: (String) -> Unit,
    onStockClick: (StockCombi) -> Unit
) {
    val filteredStocks = stocks.filter {
        it.brand.contains(searchQuery, ignoreCase = true) ||
        it.model.contains(searchQuery, ignoreCase = true)
    }

    Column(modifier = Modifier.padding(16.dp)) {
        // Header
        Text("Stok Takibi", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 16.dp))
        
        // Search
        OutlinedTextField(
            value = searchQuery,
            onValueChange = onSearchQueryChanged,
            placeholder = { Text("Marka/Model Ara...", color = Color(0xFF64748B)) },
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFF3B82F6),
                unfocusedBorderColor = Color(0xFF334155),
                focusedContainerColor = Color(0xFF1E293B),
                unfocusedContainerColor = Color(0xFF1E293B),
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White
            )
        )

        Spacer(modifier = Modifier.height(16.dp))

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color(0xFF3B82F6))
            }
        } else if (filteredStocks.isEmpty()) {
             Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Stok bulunamadı.", color = Color.Gray)
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(filteredStocks) { stock ->
                    StockCard(stock = stock, onClick = { onStockClick(stock) })
                }
            }
        }
    }
}

@Composable
fun StockCard(stock: StockCombi, onClick: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier.fillMaxWidth().clickable { onClick() }
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Quantity Badge
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (stock.quantity == 0) Color(0x20EF4444) else Color(0x203B82F6)),
                contentAlignment = Alignment.Center
            ) {
                 Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = stock.quantity.toString(),
                        color = if (stock.quantity == 0) Color(0xFFEF4444) else Color(0xFF3B82F6),
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                    Text("ADET", fontSize = 8.sp, color = if (stock.quantity == 0) Color(0xFFEF4444) else Color(0xFF3B82F6))
                 }
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column {
                Text(stock.brand, color = Color.White, fontWeight = FontWeight.Bold)
                Text(stock.model, color = Color(0xFF94A3B8), fontSize = 12.sp)
                Text(stock.capacity, color = Color(0xFF3B82F6), fontSize = 11.sp, modifier = Modifier.padding(top = 4.dp).background(Color(0xFF1E293B), RoundedCornerShape(4.dp)))
            }
        }
    }
}

@Composable
fun StockDetailView(
    stock: StockCombi,
    onBackClick: () -> Unit,
    viewModel: StockViewModel
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Giriş", "Çıkış")

    Column(modifier = Modifier.fillMaxSize().background(Color(0xFF0F172A))) {
        // App Bar
        SmallTopAppBar(
            title = {
                Column {
                    Text(stock.brand, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text("${stock.model} • ${stock.capacity}", color = Color.Gray, fontSize = 12.sp)
                }
            },
            navigationIcon = {
                IconButton(onClick = onBackClick) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Geri", tint = Color.White)
                }
            },
            colors = TopAppBarDefaults.smallTopAppBarColors(containerColor = Color(0xFF1E293B))
        )

        // Tabs
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = Color(0xFF1E293B),
            contentColor = Color.White,
            indicator = { tabPositions ->
                TabRowDefaults.Indicator(
                    modifier = Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                    color = Color(0xFF3B82F6)
                )
            }
        ) {
            tabs.forEachIndexed { index, title ->
                Tab(
                    selected = selectedTab == index,
                    onClick = { selectedTab = index },
                    text = { Text(title) }
                )
            }
        }

        // Content
        Box(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            if (selectedTab == 0) {
                InboundView(stock)
            } else {
                OutboundView(stock)
            }
        }
    }
}

@Composable
fun InboundView(stock: StockCombi) {
    if (stock.barcodes.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Barkod girişi yapılmamış.", color = Color.Gray)
        }
    } else {
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(stock.barcodes) { barcode ->
                // Check if outputted (simple check, ideal would be checking against outbound list)
                val isOutputted = stock.outboundBarcodes.any { it.originalCode == barcode.code }
                
                Card(
                    colors = CardDefaults.cardColors(containerColor = if (isOutputted) Color(0xFF3F1515) else Color(0xFF1E293B)),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(barcode.code, color = Color.White, fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace)
                        if (isOutputted) {
                            Text("Çıkışı Yapıldı", color = Color.Red, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 4.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun OutboundView(stock: StockCombi) {
    if (stock.outboundBarcodes.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Çıkış işlemi yapılmamış.", color = Color.Gray)
        }
    } else {
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(stock.outboundBarcodes) { barcode ->
                 // Check if still in stock (should theoretically not happen in Outbound view but for highlighting logic)
                val isInStock = stock.barcodes.any { it.code == barcode.originalCode }
                
                Card(
                    colors = CardDefaults.cardColors(containerColor = if (isInStock) Color(0xFF3F1515) else Color(0xFF1E293B)),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(barcode.customerName, color = Color(0xFF94A3B8), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Text(barcode.code, color = Color.White, fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace)
                         if (isInStock) {
                            Text("Stokta Mevcut (Hata)", color = Color.Red, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 4.dp))
                        }
                    }
                }
            }
        }
    }
}
