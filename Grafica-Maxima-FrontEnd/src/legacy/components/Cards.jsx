
function Card({titulo,valor,cor,img, border}){
   return(
   
    <div className="cardResumo" style={{border: border}}>
                <div className="detalheCard" style={{background: cor}}>
             <div className="iconesf"><img src={img} alt={titulo} /></div>
            <div className="detalheCard2"></div>
            <div className="detalheCard3" style={{background: cor}}></div>
           
        </div>
        
        <div className="conteudoCard">
            <p>{titulo}</p>
           <h1>{valor}</h1> 
        </div>
      
    </div>

   )
}
export default Card