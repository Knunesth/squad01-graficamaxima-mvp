import React from "react";
import { Bar } from "react-chartjs-2";
import { Chart as chartjs, LinearScale, BarElement, CategoryScale, Tooltip, Legend} from "chart.js";

// Chartjs = Nome no Grafico
// BarElement = Grafico de barra
// LinearScale = Escala linear
//Tooltip = Visualizar quando passa o mause na barra
chartjs.register(LinearScale,BarElement,CategoryScale, Tooltip, Legend) // Meu grafico vai usar essas duas propriedade


const vendasMensais = [   
    // Mes eixo X e valorVnedido eixo Y
    {mes: 1, valorVendido: 100}, // [] <= Arey
    {mes: 2, valorVendido: 150}, // {} <= Objeto
    {mes: 3, valorVendido: 80},
    {mes: 4, valorVendido: 110},
    {mes: 5, valorVendido: 200},
    {mes: 6, valorVendido: 40}
];


const data = {
     labels: ["Jan", "Fev", "Mar", "Abr", "maio", "junh"],
     datasets: [ 
        { // tudo que for sobre a barra é aqui
        label: "Vendas 2026", // Nome do grafico
        data: vendasMensais, // Dados que vai usar 
        backgroundColor: "#143a80",
        barThickness: 50,
        borderRadius: 25,
    
        parsing: {
        xAxisKey: "mes",
        yAxisKey: "valorVendido",
        },

         animation: {
         duration: 1200,
         easing: "easeOutBounce"
       }
    },
     {
      label: "Vendas 2025",
      data: [160, 25, 35, 60, 90, 40,],
      backgroundColor: " #8f9fcc",
      borderRadius: 25,

        animation: {
         duration: 1200,
         easing: "easeOutBounce"
       }
    }
     
]
}

const chartOpitions = {   
    responsive: true,
    maintainAspectRatio: false,

    scales: {
        x:{ // linha
          type: "category", //tipo
          grid: { 
          display: false,
          }
        },
        y:{ //linha
          beginAtZero: true, // começa do 0
          grid:{ 
          color: "#737cd01a", 
          }
        }
       },
       
    
        }

 function Grafico(){
    return (
  
        <Bar className="grafico" data = {data}  options={chartOpitions}// Deta = Minhas infoemações
         /> 
    )
}

export default Grafico
