"""
Simple FastAPI Backend for Financial AI Advisor
"""

from fastapi import FastAPI, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from financial_agent import financial_advisor

app = FastAPI(title="Financial Advisor API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QuestionRequest(BaseModel):
    question: str
    age: Optional[int] = None
    monthly_salary: Optional[float] = None
    risk_appetite: Optional[str] = None


@app.get("/")
async def root():
    return {
        "message": "Financial Advisor API is running",
        "endpoints": {
            "/api/ask": "POST - Ask a financial question",
            "/api/health": "GET - Health check"
        }
    }


@app.post("/api/ask")
async def ask_question(
    question: str = Form(...),
    age: Optional[int] = Form(None),
    monthly_salary: Optional[float] = Form(None),
    risk_appetite: Optional[str] = Form(None)
):
    """
    Ask a financial question to the advisor.
    
    You can provide investor profile information (age, salary, risk appetite)
    to get personalized advice.
    """
    try:
        # Detect if question is just a stock name (simple detection)
        question_clean = question.strip().upper()
        question_lower = question.strip().lower()
        question_words = question.split()
        
        # Check if it's likely just a stock name
        question_words_lower = [w.lower() for w in question_words]
        has_question_words = any(word in question_lower for word in ['what', 'should', 'tell', 'analyze', 'give', 'how', 'why', 'when', 'where', 'explain', 'recommend', 'advice', 'is', 'are', 'does', 'do', 'can', 'will'])
        
        is_stock_name_only = (
            len(question_words) <= 3 and 
            not has_question_words and
            not question_lower.startswith('?')
        )
        
        # If it looks like just a stock name, create a full analysis prompt
        if is_stock_name_only:
            stock_name = question.strip()
            full_question = f"""Do a complete financial analysis of {stock_name} stock.

Provide a full analysis following the required format including:
1. Financial performance and ratios
2. Business segments and market position
3. Trends and opportunities
4. Management and strategy
5. Big picture factors
6. Future projections
7. Investment recommendation
8. Personalized investment plan (if investor profile provided)

Determine if this stock is suitable for the investor and provide detailed financial data analysis."""
        else:
            full_question = question
        
        # Add investor profile instructions if provided
        if age or monthly_salary or risk_appetite:
            profile_parts = []
            if age:
                profile_parts.append(f"Age: {age} years")
            if monthly_salary:
                profile_parts.append(f"Monthly Salary: ₹{monthly_salary:,.0f}")
            if risk_appetite:
                profile_parts.append(f"Risk Appetite: {risk_appetite.upper()}")
            
            profile_text = "\n\nIMPORTANT: Investor Profile provided - Provide personalized investment allocation:\n"
            profile_text += "\n".join(f"- {part}" for part in profile_parts)
            profile_text += "\n\nBased on this profile, calculate and recommend:"
            profile_text += "\n1. Total monthly investment capacity (use financial planning frameworks)"
            profile_text += "\n2. Risk-based asset allocation (equity vs debt)"
            profile_text += "\n3. Specific allocation for this stock (diversification limits)"
            profile_text += "\n4. SIP recommendation for this stock"
            profile_text += "\n5. Determine if this stock suits the investor's profile"
            profile_text += "\n6. Show calculations and framework used"
            
            full_question = full_question + profile_text
        
        # Get response from financial advisor
        try:
            response = financial_advisor.run(full_question)
        except Exception as agent_error:
            print(f"Error in financial_advisor.run: {str(agent_error)}")
            import traceback
            print(traceback.format_exc())
            raise agent_error
        
        # Extract content from response
        try:
            if hasattr(response, 'content'):
                answer = response.content
            elif hasattr(response, 'text'):
                answer = response.text
            elif isinstance(response, str):
                answer = response
            else:
                answer = str(response)
        except Exception as extract_error:
            print(f"Error extracting response content: {str(extract_error)}")
            answer = str(response) if response else "Error: Could not extract response content"
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Question answered successfully",
                "question": question,
                "answer": answer,
                    "investor_profile": {
                        "age": age,
                        "monthly_salary": monthly_salary,
                    "risk_appetite": risk_appetite
                } if (age or monthly_salary or risk_appetite) else None
            }
        )
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in ask_question: {str(e)}")
        print(f"Traceback: {error_details}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error processing question: {str(e)}",
                "error_details": str(e),
                "answer": None
            }
        )


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "Financial Advisor"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
