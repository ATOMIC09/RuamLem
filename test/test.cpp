#include<stdio.h>

void name(){
    printf("frank\n");
}


float x(){
    return 9;
}


void sum(int a, int b){
    printf("%d \n", a+b);
}


int sum2(int a, int b){
    return a+b;
}




int main(){
    // name();
    int val = sum2(10, 20);
    printf("%d \n",  val);
}